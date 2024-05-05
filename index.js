require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const app =  express()

const PORT = 5000


app.use(cors({
     origin: ['http://localhost:3000','https://f1webdev.netlify.app','https://f1webdev.tech'],
     credentials: true
}))
app.use(cookieParser())
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
const createPaymentIntent = async (data) => {
     
     const optionIntent = {
          method: "POST",
          headers:{
              Accept: 'application/json',
              "Content-Type":'application/json',
              Authorization: `Basic ${Buffer.from(process.env.SECRET_KEY).toString('base64')}`
          },
          body:JSON.stringify(data)
          
      }
      
      const paymentIntent = await fetch("https://api.paymongo.com/v1/payment_intents", optionIntent)
      .then(res => {
          return res.json()
      })
      .then(res => {
          return res.data
      })
      .catch(e => {
          return e
      })
      return paymentIntent;
}
const createPaymentMethod = async (data) => {
          try {
               const response =  fetch("https://api.paymongo.com/v1/payment_methods", {
                    method: "POST",
                    headers: {
                         Accept: "application/json",
                         "Content-Type": "application/json",
                         Authorization: `Basic ${Buffer.from(process.env.SECRET_KEY).toString("base64")}`
                    },
                    body: JSON.stringify(data)
               }) 
               .then(res => {
                    return res.json()
               })
               .then(res => {
                    if(res.errors) {
                         throw new Error(JSON.stringify(res.errors)) 
                    }
                    return res.data
               })
               .catch(e => {
                    // console.log(JSON.parse(e.message),'catch 1')
                    throw new Error(JSON.stringify({error:JSON.parse(e.message),status:400})) 
                    // return e
               })
               return response
          }catch(err) {
               throw new Error({error:err,status:400})
          }
     
}
const attachIntentMethod = async (intent,method) => {
     const response = fetch(`https://api.paymongo.com/v1/payment_intents/${intent.id}/attach`,{
          method: "POST",
          headers: {
               Accept: "application/json",
               "Content-Type": "application/json",
               Authorization: `Basic ${Buffer.from(process.env.SECRET_KEY).toString("base64")}`
          },
          body: JSON.stringify({
               data: {
                    attributes: {
                         payment_method: `${method.id}`,
                         client_key: `${intent.attributes.client_key}`
                    }
               }
          })
     })
     .then(res => {
          return res.json()
     })
     .then(res => {
          const paymentIntent = res.data
          return listenToPayment(intent.id,intent.attributes.client_key)
          // return res.data
     })
     .catch(e => {
          return e
     })
     return response
}
async function listenToPayment (paymentIntentId,paymentIntentClientKey)  {
     const response = fetch(`https://api.paymongo.com/v1/payment_intents/${paymentIntentId}?client_key=${paymentIntentClientKey}`, {
          headers: {
               Authorization: `Basic ${Buffer.from(process.env.SECRET_KEY).toString("base64")}`
          }
     })
     .then(res => {
          return res.json()
     })
     .then(res => {
          return res.data
     })
     .catch(e => {
          return e
     })
     return response
}
app.options('/create-payment-intent',cors())
app.options('/attach-intent-method',cors())
app.post('/create-payment-intent',async (req,res) => {
let data = req.body
try {
     const paymentIntent = await createPaymentIntent(data);
     return res.status(200).json(JSON.stringify(paymentIntent));
 } catch (error) {
     res.status(500).json({ error: error.message });
 }
})
app.post('/attach-intent-method',async (req,res) => {
     try {
          let { data , paymentIntentId} ={ ... req.body}
          data.data.attributes.details.exp_month = parseInt(data.data.attributes.details.exp_month)
          data.data.attributes.details.exp_year = parseInt(data.data.attributes.details.exp_year)
          let paymentIntent = JSON.parse(paymentIntentId)
          if(!paymentIntent) {
               throw new Error("Something went wrong")
          }
          let paymentMethod = await createPaymentMethod(data)
          const attachResponse = await attachIntentMethod(paymentIntent,paymentMethod)
          const  createdAt_timestamp = attachResponse.attributes.created_at
          const createdAtDate = new Date(createdAt_timestamp * 1000);
          const month = (createdAtDate.getMonth() + 1).toString().padStart(2, '0');
          const day = createdAtDate.getDate().toString().padStart(2, '0'); 
          const year = createdAtDate.getFullYear();
          const formattedDate = `${month}/${day}/${year}`;
          res.status(200).json({
               email: attachResponse.attributes.payments[0].attributes.billing.email,
               amount: (attachResponse.attributes.amount) / 100,
               date:formattedDate,
               id: attachResponse.attributes.payments[0].id.slice(4)
          })
     }catch(e) {
          const statusCode = (JSON.parse(e.message)).status
          return res.status(statusCode).json(JSON.parse(e.message))
     }
})

app.get('/',(req,res) => {
     res.send('hello world')
})
app.listen(PORT,() => {
    console.log('express running')
})

