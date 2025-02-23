import CameraPartsModel from "../models/CameraParts.model.js";

export const AddCameraPartsController = async (request, response) => {
    try {
        const { name, code, image, category, partsPerCamera } = request.body;

        // Validate required fields
        if (!name || !code || !image || !category || category.length === 0) {
            return response.status(400).json({
                message: "Provide name, code, image, and at least one category.",
                error: true,
                success: false,
            });
        }

        // Create payload with all necessary fields
        const payload = {
            name,
            code,
            image,
            category,
            partsPerCamera: partsPerCamera || 1, // Use default if not provided
        };

        // Save new sub-category
        const createCameraParts = new CameraPartsModel(payload);
        const save = await createCameraParts.save();

        return response.json({
            message: "Sub Category Created",
            data: save,
            error: false,
            success: true,
        });
    } catch (error) {
        return response.status(500).json({
            message: error.message || error,
            error: true,
            success: false,
        });
    }
};


export const getCameraPartsController = async(request,response)=>{
    try {
        const data = await CameraPartsModel.find().sort({createdAt : -1}).populate('category')
        return response.json({
            message : "Sub Category data",
            data : data,
            error : false,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

export const updateCameraPartsController = async(request,response)=>{
    try {
        const { _id, name, image,category } = request.body 

        const checkSub = await CameraPartsModel.findById(_id)

        if(!checkSub){
            return response.status(400).json({
                message : "Check your _id",
                error : true,
                success : false
            })
        }

        const updateCameraParts = await CameraPartsModel.findByIdAndUpdate(_id,{
            name,
            image,
            category
        })

        return response.json({
            message : 'Updated Successfully',
            data : updateCameraParts,
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false 
        })
    }
}

export const deleteCameraPartsController = async(request,response)=>{
    try {
        const { _id } = request.body 
        console.log("Id",_id)
        const deleteSub = await CameraPartsModel.findByIdAndDelete(_id)

        return response.json({
            message : "Delete successfully",
            data : deleteSub,
            error : false,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}