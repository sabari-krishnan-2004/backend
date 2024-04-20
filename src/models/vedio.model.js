import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
const videoSchema = new Schema({
    videoFAILE : {
        typle:String,//cloudinary string
        required:true
    },
    thumbnail:{
        typle:String,//cloudinary string
        required:true
    },
    title:{
        typle:String,
        required:true
    },
    description:{
        typle:String,
        required:true
    },
    duration:{
        typle:number,
        required:true
    },
    views:{
        typle:number,
        default:0
    },
    isPublished:{
        typle:Boolean,
        default:true
    },
    owner:{
        typle:Schema.Types.ObjectId,
        ref:"User"
    }
},{
    timestamps:true
})

videoSchema.plugin(mongooseAggregatePaginate)

const Video = mongoose.model("Video",videoSchema)