import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import morgan from "morgan";
import kpiRoutes from "./routes/kpi.js";
import productRoutes from "./routes/product.js";
import transactionRoutes from "./routes/transaction.js";
import Product from "./models/Product.js";
import KPI from "./models/KPI.js";
import Transaction from "./models/Transaction.js";
import { kpis, products, transactions } from "./data/data.js";
import axios from 'axios';


/* CONFIGURATIONS */
dotenv.config()
const app = express();
app.use(express.json());
app.use(helmet());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(morgan("common"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cors());

/* ROUTES */
app.use("/kpi", kpiRoutes);
app.use("/product", productRoutes);
app.use("/transaction", transactionRoutes);

/* RELOAD TO AVOID SPIN DOWN */
// const url = `https://predictive-dashboard-6il1.onrender.com/kpi/kpis`;
// const url2 = 'https://predictive-dashboard-ml-i4go.onrender.com/suggest-price';
const url = `https://predictive-dashboard-server.onrender.com/kpi/kpis`;
const url2 = 'https://predictive-dashboard-ml.onrender.com/suggest-price';
const interval = 30000;

// function reloadWebsite() {
//     axios
//         .get(url)
//         .then((response) => {
//             console.log("Website reloaded (GET)");
//         })
//         .catch((error) => {
//             console.error(`GET Error: ${error.message}`);
//         });

//     axios
//         .post(url2, [
//             { price: 100, expense: 80, sales_volume: 50 }
//         ])
//         .then((response) => {
//             console.log("Website reloaded (POST)");
//         })
//         .catch((error) => {
//             console.error(`POST Error: ${error.message}`);
//         });
// }

// setInterval(reloadWebsite, interval);

/* MONGOOSE */
const PORT = process.env.PORT || 9000;
mongoose.connect(process.env.MONGO_URL).then(async () => {
    app.listen(PORT, () => console.log(`Server Port: ${PORT}`));

    /* ADD DATA ONE TIME LNLY OR AS NEEDED */
    // await mongoose.connection.db.dropDatabase();
    // KPI.insertMany(kpis); 
    // Product.insertMany(products);
    // Transaction.insertMany(transactions);

}).catch((error) => console.log(`${error} did not connect`));

