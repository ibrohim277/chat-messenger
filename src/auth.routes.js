import express from "express";
import { sendCode } from "./utils/sendEmail.js";

const router = express.Router();


let savedCode = "";
let savedEmail = "";



router.post("/send-code", async(req,res)=>{

try{

const {email}=req.body;


const code = Math.floor(
100000 + Math.random()*900000
);


savedCode = code;
savedEmail = email;


await sendCode(email,code);


res.json({
message:"Code sent"
});


}catch(err){

console.log(err);

res.status(500).json({
message:err.message
});

}

});





router.post("/check-code",(req,res)=>{


const {code}=req.body;


if(String(code) === String(savedCode)){


return res.json({
success:true
});


}


res.status(400).json({
success:false,
message:"Wrong code"
});


});





router.post("/reset-password",(req,res)=>{


const {email,password}=req.body;


console.log(
"CHANGE PASSWORD",
email,
password
);


res.json({
message:"Password changed"
});


});




export default router;