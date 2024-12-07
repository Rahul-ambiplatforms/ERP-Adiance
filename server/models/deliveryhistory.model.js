import mongoose from "mongoose";

const deliveryBoxSchema = new mongoose.Schema(
  {
    boxNo: { type: String, required: true },
    deliveredUIDs: { type: [String], required: true },
  },
  { _id: false }
);

const deliveryHistorySchema = new mongoose.Schema(
  {
    iwonName: { type: String, required: true },
    category: { type: String, required: true },
    boxes: [deliveryBoxSchema], // List of delivered boxes and UIDs
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const DeliveryHistoryModel =
  mongoose.models.deliveryHistory || mongoose.model("deliveryHistory", deliveryHistorySchema);

export default DeliveryHistoryModel;
