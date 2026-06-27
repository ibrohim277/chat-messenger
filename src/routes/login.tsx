import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth";
import { tokenStorage } from "@/lib/api";


const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6,"Min 6 characters"),
});


type FormValues = z.infer<typeof schema>;



export const Route = createFileRoute("/login")({

head:()=>({
meta:[{title:"Sign in — Chat"}]
}),

beforeLoad:()=>{

if(typeof window!=="undefined" && tokenStorage.getAccess()){

throw redirect({to:"/"});

}

},

component:LoginPage

});





function LoginPage(){


const navigate = useNavigate();

const login = useAuthStore((s)=>s.login);

const accessToken = useAuthStore((s)=>s.accessToken);



const [page,setPage] = useState<
"login"|"email"|"code"|"password"
>("login");



const [email,setEmail] = useState("");

const [code,setCode] = useState("");

const [password,setPassword] = useState("");




const {
register,
handleSubmit,
formState:{errors,isSubmitting}

}=useForm<FormValues>({
resolver:zodResolver(schema)
});





useEffect(()=>{

if(accessToken){

navigate({to:"/"});

}

},[accessToken,navigate]);






const loginSubmit = async(values:FormValues)=>{

try{


await login(
values.email,
values.password
);


toast.success("Welcome back");


navigate({to:"/"})


}catch{

toast.error("Login failed")

}


}






return (

<div className="flex min-h-screen items-center justify-center bg-background px-4">


<div className="w-full max-w-md rounded-2xl border bg-surface p-8">



{page==="login" && (

<>


<h1 className="text-2xl font-semibold mb-5 text-center">
Sign in
</h1>



<form
onSubmit={handleSubmit(loginSubmit)}
className="space-y-4"
>



<Field label="Email" error={errors.email?.message}>

<input

className="input"

type="email"

placeholder="email@gmail.com"

{...register("email")}

/>

</Field>





<Field label="Password" error={errors.password?.message}>


<input

className="input"

type="password"

placeholder="password"

{...register("password")}

/>


</Field>





<button
className="w-full bg-primary py-2 rounded-lg"
>

Sign in

</button>



</form>




<button

onClick={()=>setPage("email")}

className="mt-4 text-primary text-sm"

>

Forgot password?

</button>




<p className="mt-5 text-center text-sm">

No account?


<Link
to="/register"
className="text-primary ml-1"
>

Create one

</Link>


</p>


</>

)}







{page==="email" && (

<>


<h2 className="text-xl mb-4">
Enter email
</h2>



<input

className="input"

placeholder="email@gmail.com"

onChange={(e)=>setEmail(e.target.value)}

/>




<button

className="w-full bg-primary py-2 rounded-lg mt-4"


onClick={async()=>{


const res = await fetch(
"https://chat-messenger-server.onrender.com/auth/send-code",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email
})

});


if(res.ok){

toast.success("Code sent");

setPage("code");

}else{

toast.error("Email error");

}



}}


>

Send code

</button>



</>

)}







{page==="code" && (

<>


<h2 className="text-xl mb-4">
Enter code
</h2>


<input

className="input"

placeholder="123456"

onChange={(e)=>setCode(e.target.value)}

/>



<button

className="w-full bg-primary py-2 rounded-lg mt-4"


onClick={async()=>{


const res = await fetch(
"https://chat-messenger-server.onrender.com/auth/check-code",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({
email,
code
})

});


if(res.ok){

setPage("password");

}else{

toast.error("Wrong code")

}


}}


>

Verify

</button>



</>

)}








{page==="password" && (

<>


<h2 className="text-xl mb-4">
New password
</h2>




<input

className="input"

type="password"

placeholder="New password"

onChange={(e)=>setPassword(e.target.value)}

/>





<button

className="w-full bg-primary py-2 rounded-lg mt-4"


onClick={async()=>{


const res = await fetch(
"https://chat-messenger-server.onrender.com/auth/reset-password",
{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

email,

password

})

});


if(res.ok){

toast.success("Password changed");

setPage("login");

}else{

toast.error("Error")

}



}}


>

Save password

</button>




</>

)}



</div>




<style>{`

.input{

width:100%;
border:1px solid var(--border);
padding:.6rem;
border-radius:.5rem;

}

`}</style>



</div>

)

}





function Field({
label,
error,
children
}:{
label:string;
error?:string;
children:React.ReactNode;

}){


return (

<label className="block">

<span className="text-sm">
{label}
</span>


{children}


{error &&
<p className="text-red-500 text-xs">
{error}
</p>
}


</label>


)

}