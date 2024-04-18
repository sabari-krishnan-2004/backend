import dotenv from "dotenv"
import ConnectDB from "./db/index.js";

dotenv.config({
    path:'/env'
})

ConnectDB()









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