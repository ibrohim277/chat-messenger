import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({

  service:"gmail",

  auth:{
    user:"farxodsadullayev926@gmail.com",
    pass:"ftjt itpa gbih onrw"
  }

});



export const sendCode = async(email, code)=>{


  await transporter.sendMail({

    from:`farxodsadullayev926@gmail.com`,

    to:email,

    subject:"Password reset code",

    text:`Your code: ${code}`


  });


};