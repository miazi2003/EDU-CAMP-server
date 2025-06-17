const express = require("express");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 3000;
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

app.use(
  cors({
    origin: ["http://localhost:5173" , "https://teal-cendol-a8aa91.netlify.app"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.3crt5al.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const verifyToken = (req, res, next) => {
  console.log("cookie", req.cookies);

  const token = req?.cookies?.token;

  if (!token) {
    return res.status(401).send({ message: "unauthorized access" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    console.log("decoded ", decoded);
    next();
  });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {

    const database = client.db("edu-camp");
    const createCollection = database.collection("assignment-create");
    const submittedCollection = database.collection("assignment-submit");

    //jwt token creation

    app.post("/jwt", async (req, res) => {
      const userInfo = req?.body;
      console.log(userInfo);
      const token = jwt.sign(userInfo, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
      });
      console.log(token);
      res.cookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
      });
      res.send({ success: true });
    });

    //get all assignment data

    app.get("/createAssignment", async (req, res) => {
      const cursor = createCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });


      app.get("/createAssignmentAll", async (req, res) => {
      const cursor = createCollection.find();
      const result = await cursor.limit(4).toArray();
      res.send(result);
    });

    //create assignment api
    app.post("/createAssignment", verifyToken , async (req, res) => {
      const newAssignment = req.body;
      if(newAssignment.email !== req.decoded.email){
        return res.status(403).send({message : "unAuthorized"})
      }
      const result = await createCollection.insertOne(newAssignment);
      res.send(result);
    });

   //delete assignment api

   app.post("/deleteAssignment/:id", verifyToken ,   async (req, res) => {
  const id = req.params.id;
  const userEmail = req.body.email;
if(userEmail !== req.decoded.email){
  return res.status(403).send({message : "not"})
}
  const query = {
    _id: new ObjectId(id),
    email: userEmail,
  };

  const result = await createCollection.deleteOne(query);
  res.send(result);
});

    //view assignment api

    app.get("/viewAssignment/:id", verifyToken , async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await createCollection.findOne(query);
      res.send(result);

    });

    //update function get api

    app.get("/updateAllAssignment/:id", verifyToken , async (req, res) => {
      const id = req.params.id;

      const result = await createCollection.findOne({ _id: new ObjectId(id) });

      res.send(result);
    });

    //submit api
    app.post("/submittedAssignment", verifyToken, async (req, res) => {
      const newSubmit = req.body;

      const { email, assignmentId } = newSubmit;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const exist = await submittedCollection.findOne({ email, assignmentId });
      console.log(exist);
      if (exist) {
        return res
          .status(409)
          .send({ message: "you have already submitted this assignment" });
      }

      const result = await submittedCollection.insertOne(newSubmit);

      res.send(result);
    });

    //get api for submission

    app.get("/submittedAssignment", verifyToken, async (req, res) => {
      const email = req.query.email;
      console.log(email);

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const result = await submittedCollection.find(query).toArray();
      res.send(result);
    });

    //give mark get api
    app.get("/markAssignment/:id", verifyToken ,  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await submittedCollection.findOne(query);
      res.send(result);
    });

    //update assignment put api
    app.put("/updateAssignment/:id", verifyToken ,  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const newAssignment = req.body;
      console.log(newAssignment);


       const existingAssignment = await createCollection.findOne({ _id: new ObjectId(id) });

  if (!existingAssignment) {
    return res.status(404).send({ message: "Assignment not found" });
  }

  if (existingAssignment.email !== req.decoded.email) {
    return res.status(403).send({ message: "forbidden access" });
  }
      const updateDoc = {
        $set: newAssignment,
      };
      const option = { upsert: true };
      const result = await createCollection.updateOne(query, updateDoc, option);
      res.send(result);
    });

    //pending get api

    app.get("/pendingAssignment", verifyToken, async (req, res) => {
      const status = req.query.status;

      const query = { status: status };
      const result = await submittedCollection.find(query).toArray();
      res.send(result);
    });

    //give mark put api

    app.put("/updateAssignmentSubmit/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const { result, email } = req.body;

      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }

      const query = {
        _id: new ObjectId(id),
      };

      const exist = await submittedCollection.findOne(query);

      if (!exist) {
        return res.status(404).send({
          message: "Submission not found for this id.",
        });
      }

      if (exist.email === email) {
        return res
          .status(403)
          .send({ message: "you cant mark your own submission" });
      }
      const updateDoc = {
        $set: result,
      };

      const resultUpdate = await submittedCollection.updateOne(
        query,
        updateDoc
      );
      res.send(resultUpdate);
    });

    //all assignment search api

    app.get("/searchAssignment", async (req, res) => {
      const key = req.query.search;
      console.log("key", key);
      let query = {};

      if (key) {
        query = {
          $or: [
            { title: { $regex: key, $options: "i" } },
            { description: { $regex: key, $options: "i" } },
            { difficulty: { $regex: key, $options: "i" } },
          ],
        };
      }

      const result = await createCollection.find(query).toArray();
      res.send(result);
    });



       app.get("/deadline", async (req, res) => {
     try{
       const result = await createCollection
        .find()
        .sort({ deadline: 1 })
        .limit(4)
        .toArray();
      res.send(result);
     }catch(error){res.send({error : true , message : error.message})};
      
    });

    
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  console.log("server running");
  res.send("server is cooking for eduCamp");
});

app.listen(port, () => {
  console.log("server running on ", port);
});
