import express from "express";
import "dotenv/config";
import grades from './routes/grades.js';
import grades_agg from "./routes/grades_agg.js";
import stats from "./routes/stats.js";

const PORT = process.env.PORT || 3000
const app = express();

// Body parser middleware
app.use(express.json())

// test db connection
// import "./db/conn.js"

app.get("/", (req, res) => {
  res.send("Welcome to the API")
})


app.use("/grades/stats", stats);
app.use("/grades", grades)
app.use("/grades", grades_agg);



//Global Error handling middlware
app.use((err, req, res, next) => {
  console.log(err)
  res.status(500).send("Seems like we messed up somewhere...")
})

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`)
})