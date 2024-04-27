import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAccessTokenAndRefreshToken = async(userId)=>{
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

    if (!username&&!email) {
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

    const {accessToken,refreshToken}=await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,{
                user:loggedInUser,refreshToken,accessToken
            },
            "user logged in successfuly"
        )
    )

})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken:undefined
            }
        },
        {
            new:true
        }
    )

    const options = {
        httpOnly : true,
        secure : true
    }

    return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
    .json(
        new ApiResponse(
            200,{},"user logged out"
        )
    )
})

const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

    if (!incomingRefreshToken) {
        throw new ApiError(400,"unauthorized access")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await User.findById(decodedToken?._id)
    
        if (!user) {
            throw new ApiError(401,"invalid refresh token")  
        }
    
        if (incomingRefreshToken!==user?.refreshAccessToken) {
            throw new ApiError(401,"refresh token is expired or used")
        }
    
        const options={
            httpOnly:true,
            secure:true
        }
    
        const {accessToken,newrefreshToken}=await generateAccessTokenAndRefreshToken(user._id)
    
        return res.status(200).cookie("accessToken",accessToken,options).cookie("refreshToken",newrefreshToken,options)
        .json(
            new ApiResponse(
                200,{
                    accessToken,
                    refreshToken:newrefreshToken
                },
                "access token refreshed successfuly"
            )
        )
    } catch (error) {
        throw new ApiError(401,"invalid refresh token")
    }

})

const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword}=req.body

    const user = User.findById(req.user._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,"old password is incorrect")
    }

    user.password=newPassword
    await user.save({validateBeforeSave:false})

    return res.status(200).
    json( new ApiResponse(200,{},"password changed"))
})

const getcurrentUser = asyncHandler(async(req,res)=>{
    res.status(200).
    json(200,req.user,"current user fetched successfuly")
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email}=req.body

    if(!fullname || !email){
        throw new ApiError(400,"all fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set:{
                fullname,
                email,
            }
        },
        {
            new:true
        }
    ).select("-password")

    return res.status(200).json(200,new ApiResponse(200,user,"user details updated successfully"))
})

const updateUserAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath= req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400,"avatar file is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400,"error on uploading to cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
    {
        $set:{
            avatar: avatar.url
        }
    },
    {
        new:true
    }
).select("-password")

return res.status(200).json(new ApiResponse(200,user,"avatar of the user successfully changed"))
})

const updatecoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400,"cover image is empty")
    }

    coverImage=await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400,"something went wrong while uploading in cloudinary")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
    {
        $set : {
            coverImage : coverImage.url
        }
    },
    {new:true}
    ).select("-password")

    return res.status(200).json(new ApiResponse(200,user,"coverimage of the user successfully changed"))
})


export {registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    getcurrentUser,
    changeCurrentPassword,
    updateAccountDetails,
    updateUserAvatar,
    updatecoverImage
};