import mongoose from "mongoose";
import ClientProject from "../models/ClientProject.js";

export const createClient = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Client/Project name is required" });
    }
    const trimmedName = String(name).trim();
    const existing = await ClientProject.findOne({ user: req.user._id, name: trimmedName });
    if (existing) {
      return res.status(200).json({ success: true, client: existing, reused: true });
    }
    const client = await ClientProject.create({ user: req.user._id, name: trimmedName });
    return res.status(201).json({ success: true, client });
  } catch (error) {
    return next(error);
  }
};

export const getClients = async (req, res, next) => {
  try {
    const clients = await ClientProject.find({ user: req.user._id }).sort({ name: 1 });
    return res.status(200).json({ success: true, count: clients.length, clients });
  } catch (error) {
    return next(error);
  }
};

export const updateClient = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Client/Project not found" });
    }
    const client = await ClientProject.findOne({ _id: req.params.id, user: req.user._id });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client/Project not found" });
    }
    const { name } = req.body;
    if (!name || !String(name).trim()) {
      return res.status(400).json({ success: false, message: "Client/Project name is required" });
    }
    client.name = String(name).trim();
    await client.save();
    return res.status(200).json({ success: true, client });
  } catch (error) {
    return next(error);
  }
};

export const deleteClient = async (req, res, next) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ success: false, message: "Client/Project not found" });
    }
    const client = await ClientProject.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!client) {
      return res.status(404).json({ success: false, message: "Client/Project not found" });
    }
    return res.status(200).json({ success: true, message: "Client/Project deleted successfully" });
  } catch (error) {
    return next(error);
  }
};

export const ensureClientProject = async ({ userId, name }) => {
  const trimmed = String(name || "").trim();
  if (!trimmed) return null;
  try {
    let client = await ClientProject.findOne({ user: userId, name: trimmed });
    if (!client) {
      client = await ClientProject.create({ user: userId, name: trimmed });
    }
    return client;
  } catch {
    const existing = await ClientProject.findOne({ user: userId, name: trimmed });
    return existing;
  }
};