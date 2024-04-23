import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const generateAcessTokenAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAcessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken=refreshToken
        await user.save({validateBeforeSave : false})
        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating refresh and access token")
    }
}

const registerUser = asyncHandler(async (req,res)=>{
    const {username,email,fullname,password}=req.body
    console.log("email :",email);

    if([username,email,fullname,password].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"all fields are required")
    }

    const existedUser = await User.findOne({
        $or:[{username},{email}]
    })

    if(existedUser){
        throw new ApiError(409,"user with email or username already exists")
    }
    console.log("starting to upload");
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if (!avatarLocalPath) {
        throw new ApiError(400,"cover image is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log("avatar uploaded");
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log("coverimage uploaded");

    if (!avatar) {
        throw new ApiError(400,"avatar file is required")
    }

    const user= await User.create({
        email,
        fullname,
        avatar:avatar.url,
        coverImage:coverImage.url||"",
        password,
        username:username.toLowerCase()
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500,"something went wrong while registering a user")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered successfully")
    )


})

const loginUser = asyncHandler(async (req,res)=>{
    //req.body --> data
    //username or email
    //find username
    //password check
    //access and refresh token
    //send cookie

    const {username,email,password} = req.body

    if (!username||!email) {
        throw new ApiError(400,"username or password is required")
    }
    const user = await User.findOne({
        $or : [{username},{email}]
    })

    if (!user) {
        throw new ApiError(404,"user does not exist")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)
    if (!isPasswordValid) {
        throw new ApiError(401,"password is incorrect")
    }

    const {accessToken,refreshToken}=await generateAcessTokenAndRefreshToken(user._id)

})

export {registerUser,
    loginUser
};