import mongoose from "mongoose";
import Team from "../models/Team.js";
import TeamRequest from "../models/TeamRequest.js";
import User from "../models/User.js";

const getMemberUserId = (member) => member?.user?._id || member?.user;

const formatMember = (member) => ({
  id: getMemberUserId(member),
  name: member.user?.name,
  email: member.user?.email,
  role: member.role,
  joinedAt: member.joinedAt,
});

const formatTeam = (team, viewerId) => {
  const viewerMember = team.getMember(viewerId);

  return {
    id: team._id,
    name: team.name,
    inviteCode: team.inviteCode,
    monthlyBudget: team.monthlyBudget,
    currency: team.currency,
    currentSpending: team.currentSpending,
    remainingBudget: Math.max(0, team.monthlyBudget - team.currentSpending),
    createdBy: team.createdBy,
    createdAt: team.createdAt,
    members: team.members.map(formatMember),
    viewerRole: viewerMember?.role || null,
  };
};

const makeInviteCode = async () => {
  let inviteCode = Team.generateInviteCode();
  let attempts = 0;

  while ((await Team.exists({ inviteCode })) && attempts < 8) {
    inviteCode = Team.generateInviteCode();
    attempts += 1;
  }

  return inviteCode;
};

const resolveMembershipState = async (user) => {
  // Team.members is the source of truth for membership.
  const actualTeams = await Team.find({ "members.user": user._id })
    .populate("members.user", "name email")
    .sort({ createdAt: -1 });

  const actualIds = actualTeams.map((team) => team._id);
  const actualIdStrings = new Set(actualIds.map((id) => id.toString()));

  let activeId = (user.activeTeam || user.team)?.toString() || null;

  // If the stored active team is missing/stale, use the first real membership.
  if (!activeId || !actualIdStrings.has(activeId)) {
    activeId = actualIds[0]?.toString() || null;
  }

  const normalizedTeams = actualIds;
  const normalizedActive = activeId
    ? actualIds.find((id) => id.toString() === activeId) || null
    : null;

  const oldTeamIds = (user.teams || []).map((id) => id.toString()).sort();
  const newTeamIds = normalizedTeams.map((id) => id.toString()).sort();

  const teamsChanged =
    oldTeamIds.length !== newTeamIds.length ||
    oldTeamIds.some((id, index) => id !== newTeamIds[index]);

  const activeChanged =
    (user.activeTeam?.toString() || null) !==
    (normalizedActive?.toString() || null);

  const legacyTeamChanged =
    (user.team?.toString() || null) !==
    (normalizedActive?.toString() || null);

  if (teamsChanged || activeChanged || legacyTeamChanged) {
    user.teams = normalizedTeams;
    user.activeTeam = normalizedActive;
    user.team = normalizedActive;
    await user.save();
  }

  const activeTeam = normalizedActive
    ? actualTeams.find(
        (team) => team._id.toString() === normalizedActive.toString()
      ) || null
    : null;

  return {
    teams: actualTeams,
    activeTeam,
    activeTeamId: normalizedActive,
  };
};

export const createTeam = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    const monthlyBudget = Number(req.body.monthlyBudget);
    const currency = String(
      req.body.currency || req.user.baseCurrency || "BDT"
    )
      .trim()
      .toUpperCase();

    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Team name must contain at least 2 characters",
      });
    }

    if (!Number.isFinite(monthlyBudget) || monthlyBudget < 0) {
      return res.status(400).json({
        success: false,
        message: "Monthly budget must be a valid non-negative number",
      });
    }

    const team = await Team.create({
      name,
      inviteCode: await makeInviteCode(),
      createdBy: req.user._id,
      monthlyBudget,
      currency,
      members: [{ user: req.user._id, role: "admin" }],
    });

    req.user.teams = req.user.teams || [];

    if (
      !req.user.teams.some(
        (id) => id.toString() === team._id.toString()
      )
    ) {
      req.user.teams.push(team._id);
    }

    req.user.activeTeam = team._id;
    req.user.team = team._id;
    req.user.role = "teamAdmin";
    await req.user.save();

    await team.populate("members.user", "name email");

    return res.status(201).json({
      success: true,
      message: "Your team has been created",
      team: formatTeam(team, req.user._id),
    });
  } catch (error) {
    return next(error);
  }
};

export const joinTeam = async (req, res, next) => {
  try {
    const inviteCode = String(req.body.inviteCode || "")
      .trim()
      .toUpperCase();

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: "An invitation code is required",
      });
    }

    const team = await Team.findOne({ inviteCode });

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "No team was found for that invitation code",
      });
    }

    if (!team.getMember(req.user._id)) {
      team.members.push({ user: req.user._id, role: "member" });
      await team.save();
    }

    req.user.teams = req.user.teams || [];

    if (
      !req.user.teams.some(
        (id) => id.toString() === team._id.toString()
      )
    ) {
      req.user.teams.push(team._id);
    }

    req.user.activeTeam = team._id;
    req.user.team = team._id;
    await req.user.save();

    await team.populate("members.user", "name email");

    return res.json({
      success: true,
      message: `You have joined ${team.name}`,
      team: formatTeam(team, req.user._id),
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyTeams = async (req, res, next) => {
  try {
    const state = await resolveMembershipState(req.user);

    return res.json({
      success: true,
      activeTeamId: state.activeTeamId || null,
      teams: state.teams.map((team) => formatTeam(team, req.user._id)),
    });
  } catch (error) {
    return next(error);
  }
};

export const switchActiveTeam = async (req, res, next) => {
  try {
    const team = await Team.findById(req.params.id).populate(
      "members.user",
      "name email"
    );

    if (!team || !team.getMember(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this team",
      });
    }

    req.user.teams = req.user.teams || [];

    if (
      !req.user.teams.some(
        (id) => id.toString() === team._id.toString()
      )
    ) {
      req.user.teams.push(team._id);
    }

    req.user.activeTeam = team._id;
    req.user.team = team._id;
    await req.user.save();

    return res.json({
      success: true,
      message: `Switched to ${team.name}`,
      team: formatTeam(team, req.user._id),
    });
  } catch (error) {
    return next(error);
  }
};

export const getMyTeam = async (req, res, next) => {
  try {
    const state = await resolveMembershipState(req.user);
    const team = state.activeTeam;

    if (!team) {
      return res.json({ success: true, team: null });
    }

    const [pendingCount, modificationCount] = await Promise.all([
      TeamRequest.countDocuments({
        team: team._id,
        status: "pending",
      }),
      TeamRequest.countDocuments({
        team: team._id,
        status: "modification_requested",
      }),
    ]);

    return res.json({
      success: true,
      team: {
        ...formatTeam(team, req.user._id),
        pendingRequestsCount: pendingCount,
        modificationRequestedCount: modificationCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const regenerateInviteCode = async (req, res, next) => {
  try {
    const state = await resolveMembershipState(req.user);
    const team = state.activeTeam;

    if (!team) {
      return res.status(404).json({
        success: false,
        message: "Team not found",
      });
    }

    if (!team.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Only the Team Admin can regenerate the invitation code",
      });
    }

    team.inviteCode = await makeInviteCode();
    await team.save();

    return res.json({
      success: true,
      message: "A new invitation code has been generated",
      team: formatTeam(team, req.user._id),
    });
  } catch (error) {
    return next(error);
  }
};

export const loadTeamForUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    return { user: null, team: null };
  }

  const state = await resolveMembershipState(user);

  return {
    user,
    team: state.activeTeam,
  };
};

export const teamFormatter = formatTeam;
export const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
