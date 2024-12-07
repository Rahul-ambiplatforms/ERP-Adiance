import mongoose from "mongoose";
import "../models/category.model.js";
import "../models/subCategory.model.js";

const damageProductSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: "category", required: true },
    subCategory: { type: mongoose.Schema.Types.ObjectId, ref: "subCategory", required: true },
    boxNo: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    action: { type: String, enum: ["Add", "Out"], required: true },
    remarks: { type: String, default: "" }, // Optional field for comments
    deleted: { type: Boolean, default: false }, // Optional soft delete
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Optional user tracking
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

// Index for faster queries
damageProductSchema.index({ category: 1, subCategory: 1, boxNo: 1, action: 1 }, { unique: true });
damageProductSchema.index({ createdAt: -1 });

const DamageProduct =
  mongoose.models.DamageProduct || mongoose.model("DamageProduct", damageProductSchema);

export default DamageProduct;
