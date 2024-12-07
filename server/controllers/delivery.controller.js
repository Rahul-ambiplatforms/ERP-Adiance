import ReadyCameraModel from "../models/readycamera.model.js";
import DeliveryHistoryModel from "../models/deliveryhistory.model.js";

export const deliverCamera = async (req, res) => {
    try {
      const { iwonName, category, boxes } = req.body;
  
      if (!iwonName || !category || !Array.isArray(boxes) || boxes.length === 0) {
        return res.status(400).json({
          message: "IWON Name, Category, and at least one box are required.",
          success: false,
        });
      }
  
      // Prepare delivery data
      const deliveryData = {
        iwonName,
        category,
        boxes: boxes.map((box) => ({
          boxNo: box.boxNo,
          deliveredUIDs: box.selectedUIDs,
        })),
      };
  
      // Remove UIDs from the readyCamera collection
      for (const box of boxes) {
        const { boxNo, selectedUIDs } = box;
  
        // Remove UIDs from readyCamera collection
        const updatedBox = await ReadyCameraModel.findOneAndUpdate(
          { "boxes.boxNo": boxNo },
          {
            $pull: { "boxes.$.partUIDs": { $in: selectedUIDs } },
          },
          { new: true }
        );
  
        if (updatedBox) {
          // Update the total parts count for the box
          const boxToUpdate = updatedBox.boxes.find((b) => b.boxNo === boxNo);
          if (boxToUpdate) {
            const newTotalParts = boxToUpdate.partUIDs.length;
            await ReadyCameraModel.updateOne(
              { "boxes.boxNo": boxNo },
              {
                $set: {
                  "boxes.$.totalParts": newTotalParts,
                },
              }
            );
          }
  
          // Remove boxes with zero UIDs
          await ReadyCameraModel.updateOne(
            { "boxes.boxNo": boxNo },
            {
              $pull: {
                boxes: {
                  boxNo: boxNo,
                  partUIDs: { $size: 0 },
                },
              },
            }
          );
        }
      }
  
      // Save the delivery history
      const deliveryHistory = new DeliveryHistoryModel(deliveryData);
      await deliveryHistory.save();
  
      res.status(200).json({
        message: "Cameras delivered successfully and history saved.",
        success: true,
      });
    } catch (error) {
      console.error("Error in deliverCamera:", error.message);
      res.status(500).json({
        message: "Failed to deliver cameras.",
        success: false,
      });
    }
  };
  

export const getDeliveryHistory = async (req, res) => {
    try {
      const { category, date } = req.query;
  
      const filters = {};
      if (category) filters.category = category;
      if (date) filters.createdAt = { $gte: new Date(date) };
  
      const history = await DeliveryHistoryModel.find(filters).sort({ createdAt: -1 });
  
      res.status(200).json({
        message: "Delivery history fetched successfully.",
        data: history,
        success: true,
      });
    } catch (error) {
      console.error("Error in getDeliveryHistory:", error.message);
      res.status(500).json({
        message: "Failed to fetch delivery history.",
        success: false,
      });
    }
  };
  