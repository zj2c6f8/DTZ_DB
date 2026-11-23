const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());

let isConnected = false;
async function connectDB(){
  if(isConnected) return;
  await mongoose.connect(process.env.MONGO_URL);
  isConnected = true;
  console.log('DTZ DB Connected ✅');
}

const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({ username: String, password: String, apiKey: String }));
const Doc = mongoose.models.Doc || mongoose.model('Doc', new mongoose.Schema({ userId: String, collection: String, name: String, data: String }, { timestamps: true }));

app.post('/api/auth', async (req,res)=>{
  await connectDB();
  const { username, password } = req.body;
  let user = await User.findOne({username});
  if(user){
    if(!await bcrypt.compare(password, user.password)) return res.json({error:'Password වැරදියි'});
  } else {
    const hash = await bcrypt.hash(password, 10);
    const apiKey = 'DTZ-'+Date.now()+'-'+Math.random().toString(36).slice(2,8);
    user = await User.create({ username, password: hash, apiKey });
  }
  res.json({ apiKey: user.apiKey, username });
});

app.post('/api/data', async (req,res)=>{
  await connectDB();
  const { apiKey, collection, name, data } = req.body;
  const user = await User.findOne({apiKey});
  if(!user) return res.json({error:'API Key වැරදියි'});
  const doc = await Doc.create({ userId: user._id, collection, name, data });
  res.json({ success:true, doc });
});

app.get('/api/data/:apiKey/:collection', async (req,res)=>{
  await connectDB();
  const user = await User.findOne({apiKey: req.params.apiKey});
  if(!user) return res.json({error:'API Key වැරදියි'});
  const docs = await Doc.find({ userId: user._id, collection: req.params.collection });
  res.json(docs);
});

app.delete('/api/data/:apiKey/:id', async (req,res)=>{
  await connectDB();
  await Doc.deleteOne({ _id: req.params.id });
  res.json({ success:true });
});

app.get('/api', (req,res)=>res.json({message:'DTZ DB Running 🍃'}));

module.exports = app;
