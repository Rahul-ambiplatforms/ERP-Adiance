import mongoose from "mongoose";

const subCategorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true },
    image: { type: String, default: "" },
    partsPerCamera: { type: Number, default: 1 },
    category: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "category", // Must match `category.model.js`
        required: true,
      },
    ],
  },
  { timestamps: true }
);

const SubCategoryModel =
  mongoose.models.subCategory || mongoose.model("subCategory", subCategorySchema);

export default SubCategoryModel;
