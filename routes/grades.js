import express from 'express';
import db from '../db/conn.js'
import { ObjectId } from 'mongodb';

const router = express.Router()
// base path: /grades

// Get a single grade entry
router.get('/:id', async (req, res, next) => {
  try {
    let collection = db.collection("grades");
    const query = { _id: new ObjectId(req.params.id) }
    let result = await collection.findOne(query);

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err) // the next function directs the err to the global error handling middleware
  }
})


// Backwards compatibility or students/learners
router.get("/student/:id", (req, res) => {
  res.redirect(`../learner/${req.params.id}`)
})

// Get a student's grade data
router.get('/learner/:id', async (req, res, next) => {
  try {
    let collection = db.collection("grades")
    let query = { learner_id: Number(req.params.id) }

    if (req.query.class) {
      query.class_id = Number(req.query.class)
    }

    let result = await collection.find(query).toArray()

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err)
  }
})

// Get a class's grade data
router.get('/class/:id', async (req, res, next) => {
  try {
    let collection = db.collection("grades")
    let query = { class_id: Number(req.params.id) }

    if (req.query.learner) {
      query.learner_id = Number(req.query.learner)
    }

    let result = await collection.find(query).toArray()

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err)
  }
})

// get learner average for EACH class
router.get("/learner/:id/class/average", async (req, res, next) => {
  try {
    let collection = db.collection("grades");
    let query = { learner_id: Number(req.params.id) }
    let learnerGrades = await collection.find(query).toArray()

    const averages = learnerGrades.reduce((acc, grade) => {
      let sum = 0;
      for (let i = 0; i < grade.scores.length; i++) {
        if (typeof grade.scores[i].score === 'number') {
          sum += grade.scores[i].score
        }
      }
      acc[grade.class_id] = sum / grade.scores.length
      return acc
    }, {})

    res.send(averages).status(200)

  } catch (err) {
    next(err)
  }
})



// to get overall average of a learner
router.get("/learner/:id/average", async (req, res, next) => {
  try {
    let collection = db.collection("grades");
    let query = { learner_id: Number(req.params.id) }
    let learnerGrades = await collection.find(query).toArray()
    let sum = 0;
    let scoreCount = 0
    for (let i = 0; i < learnerGrades.length; i++) {
      for (let j = 0; j < learnerGrades[i].scores.length; j++) {
        if (typeof learnerGrades[i].scores[j].score === 'number') {
          sum += learnerGrades[i].scores[j].score
        }
        scoreCount++
      }
    }

    const overallScore = sum / scoreCount

    res.send("Over average: " + overallScore).status(200)
  } catch (err) {
    next(err)
  }
})




// Create a single grade entry
router.post('/', async (req, res, next) => {
  try {
    let collection = db.collection("grades");
    let newDocument = req.body

    if (newDocument.student_id) {
      newDocument.learner_id = newDocument.student_id;
      delete newDocument.student_id
    }

    let result = await collection.insertOne(newDocument)
    res.send(result).status(201)
  } catch (err) {
    next(err)
  }
})


// Add a score to a grade entry
router.patch('/:id/add', async (req, res, next) => {
  try {
    let collection = db.collection("grades");
    let query = { _id: ObjectId.createFromHexString(req.params.id) }

    let result = await collection.updateOne(query, {
      $push: { scores: req.body }
    })

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err)
  }
})

// Remove a score from a grade entry
router.patch('/:id/remove', async (req, res, next) => {
  try {
    let collection = db.collection("grades");
    let query = { _id: ObjectId.createFromHexString(req.params.id) }

    let result = await collection.updateOne(query, {
      $pull: { scores: req.body }
    })

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err)
  }
})

// Extra Route to combine the two above Add/Remove
// router.patch('/:id/:operation', async (req, res, next) => {
//   try {
//     let collection = db.collection("grades");
//     let query = { _id: ObjectId.createFromHexString(req.params.id) }
//     let update = {};

//     if (req.params.operation === "add") {
//       update["$push"] = { scores: req.body }
//     } else if (req.params.operation === "remove") {
//       update["$pull"] = { scores: req.body }
//     } else {
//       res.status(400).send("Invalid Operation")
//       return
//     }

//     let result = await collection.updateOne(query, update)

//     if (!result) res.send("Not Found").status(404)
//     else res.send(result).status(200)
//   } catch (err) {
//     next(err)
//   }
// // })

router.patch("/class/:id", async (req, res, next) => {
  try {
    let collection = db.collection("grades")
    let query = { class_id: Number(req.params.id) }

    let result = await collection.updateMany(query, {
      $set: { class_id: req.body.class_id }
    })

    if (!result) res.send("Not found").status(404);
    else res.send(result).status(200);
  } catch (err) {
    next(err)
  }
})




router.delete("/:id", async (req, res, next) => {
  try {
    let collection = db.collection("grades");
    let query = { _id: ObjectId.createFromHexString(req.params.id) }
    let result = await collection.deleteOne(query)

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err)
  }
})
// Delete a learner's grade entries
router.delete("/learner/:id", async (req, res, next) => {
  try {
    let collection = db.collection("grades")
    let query = { learner_id: Number(req.params.id) }

    let result = await collection.deleteMany(query)

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err)
  }
})

// Delete a class's grade entries
router.delete("/class/:id", async (req, res, next) => {
  try {
    let collection = db.collection("grades")
    let query = { class_id: Number(req.params.id) }

    let result = await collection.deleteMany(query)

    if (!result) res.send("Not Found").status(404)
    else res.send(result).status(200)
  } catch (err) {
    next(err)
  }
})



export default router