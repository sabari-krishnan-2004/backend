import dotenv from "dotenv"
import ConnectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
    path:'/env'
})

ConnectDB()
.then(()=>{
    app.listen(process.env.PORT ||8000,()=>{
        console.log(`server is running on port : ${process.env.PORT}`);
    })
})
.catch((err)=>{
    console.log("mongodb connection failed !! : ",err);
})









/*
import mongoose from "mongoose";
import {DB_NAME} from './constants';

( async ()=>{
    try {
        await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
    } catch (error) {
        console.error("ERROR : ", error)
        throw err
    }
})()*/