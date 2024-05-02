require('dotenv').config()
const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const bodyParser = require('body-parser')
const app =  express()

const PORT = 5000


app.use(cors({
     origin: ['http://localhost:3000','https://f1webdev.netlify.app/'],
     credentials: true
}))
app.use(cookieParser())
app.use(bodyParser.urlencoded({extended:true}))
app.use(bodyParser.json())
const handler = async (optionsIntent , res) => {
    try {
        const response = await fetch("https://api.paymongo.com/v1/payment_intents", optionsIntent);
        const responseData = await response.json();
    
        if (responseData.errors) {
          console.log(JSON.stringify(responseData.errors));
          res.status(500).json({ error: responseData.errors });
        } else {
          res.status(200).json({ body: responseData });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
      }
}
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
     //  console.log(paymentIntent)
      return paymentIntent;
}
const createPaymentMethod = async (data) => {
     // try {
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
               // const responseData =  await response
               // if(!response.ok && responseData.errors) {
               //  throw new Error(responseData.errors) 
               // }
               // console.log(responseData,'res data')
               return response
          }catch(err) {
               // console.log(err,'this is error 2')
               throw new Error({error:err,status:400})
          }
          // const responseData =  response.json();
          // if(!response.ok && responseData.errors) {
          //       throw new Error(JSON.stringify(responseData.errors)) 
          // }
          // return res.status(200).json({ body: responseData.data });
     // }catch(err) {
     //      return res.status(400).json({error:JSON.parse(err.message)})
     // }
     //    return paymentMethod
     
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
          // const paymentIntentStatus = paymentIntent.attributes.status
          // console.log(paymentIntent)
          // if(paymentIntentStatus === 'awaiting_next_action') {
          //      window.open(paymentIntent.attributes.next_action.redirect.url, "_blank")
          // }
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
// app.post('/create-payment-method',  async (req,res) => {
//      try {
//           const paymentMethod = await createPaymentMethod();
//           const paymentMethodData = paymentMethod.data
//           res.json({ data: paymentMethod });
//      }catch(e) {
//           console.log(e)
//      }
// })
app.post('/create-payment-intent',async (req,res) => {
//     console.log("SECRET_KEY:", process.env.SECRET_KEY);
//     const data =  {
//         data: {
//              attributes: {
//                   amount: 10000 ,
//                   payment_method_allowed: [
//                        "card"
//                   ],
//                   payment_method_options: {
//                        card: {
//                             "request_three_d_secure": "any"
//                        }
//                   },
//                   currency: "PHP",
//                   description: "description",
//                   statement_descriptor: "descriptor business name"
//              }
//         }
//      }
//     const optionIntent = {
//         method: "POST",
//         headers:{
//             Accept: 'application/json',
//             "Content-Type":'application/json',
//             Authorization: `Basic ${Buffer.from(process.env.SECRET_KEY).toString('base64')}`
//         },
//         body:JSON.stringify(data)
        
//     }
//     return handler(optionIntent, res)
let data = req.body
console.log(data)
let cookie = req.cookies['payment-intent']
try {
     const paymentIntent = await createPaymentIntent(data);
     const paymentBody = paymentIntent.body
     res.cookie('payment-intent',paymentIntent)
     return res.status(200).json('success');
 } catch (error) {
     res.status(500).json({ error: error.message });
 }
})
app.post('/attach-intent-method',async (req,res) => {
     try {
          let data ={ ... req.body}
          data.data.attributes.details.exp_month = parseInt(data.data.attributes.details.exp_month)
          data.data.attributes.details.exp_year = parseInt(data.data.attributes.details.exp_year)
          // let paymentIntent = await createPaymentIntent()
          let paymentIntent = req.cookies['payment-intent']
          if(!paymentIntent) {
               throw new Error("Something went wrong")
          }
          let paymentMethod = await createPaymentMethod(data)
          const attachResponse = await attachIntentMethod(paymentIntent,paymentMethod)
          // const retrievePaymentIntent = await listenToPayment(paymentIntent.id,paymentIntent.attributes.client_key)
          // console.log(paymentIntent.id,'paymentIntent.id')
          // console.log(paymentIntent,'paymentIntent.client_key')
          // console.log(retrievePaymentIntent,'retrievePaymentIntent')
          console.log(attachResponse.attributes.payments[0].id.slice(4),'this is response')
          const  createdAt_timestamp = attachResponse.attributes.created_at
          const createdAtDate = new Date(createdAt_timestamp * 1000);
          const month = (createdAtDate.getMonth() + 1).toString().padStart(2, '0');
          const day = createdAtDate.getDate().toString().padStart(2, '0'); 
          const year = createdAtDate.getFullYear();

          const formattedDate = `${month}/${day}/${year}`;
          console.log(formattedDate , 'this is the format'); 
          res.cookie('receipt', {
               email: attachResponse.attributes.payments[0].attributes.billing.email,
               amount: (attachResponse.attributes.amount) / 100,
               date:formattedDate,
               id: attachResponse.attributes.payments[0].id.slice(4)
          })
          res.status(200).json(attachResponse)
     }catch(e) {
          console.log(JSON.parse(e.message),'this is error4')
          const statusCode = (JSON.parse(e.message)).status
          return res.status(statusCode).json(JSON.parse(e.message))
          // throw new Error(JSON.parse(e.message))
     }

     // await attachIntentMethod()
})


app.listen(PORT,() => {
    console.log('express running')
})

