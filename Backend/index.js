const express = require("express");
const { open } = require('sqlite');
const sqlite3 = require('sqlite3');

const cors = require('cors')

const path = require('path');

const app = express();
app.use(cors())

const dbPath = path.join(__dirname, 'roxiller.db');
let db = null;

const initializeDbAndServer = async () => {
    try {
        db = await open({
            filename: dbPath,
            driver: sqlite3.Database
        });

        app.listen(4001, () => {
            console.log("Server is started");
        });
    } catch (e) {
        console.error("Error during initialization:", e);
        process.exit(1);
    }
};

initializeDbAndServer();

app.get("/populateDb", async (req, res) => {
    try {
        const response = await fetch('https://s3.amazonaws.com/roxiler.com/product_transaction.json');
        const data = await response.json();
        console.log('response =', data);

        await Promise.all(data.map(async each => {
            const { id, title, price, description, category, image, sold, dateOfSale} = each;

            const query = `
                INSERT INTO roxiller (id, title, price, description, category, image, sold, dateOfSale)
                VALUES (?,?, ?, ?, ?,?, ?, ?);
            `;





            await new Promise((resolve, reject) => {
                db.run(query, [id, title, price, description, category, image, sold, dateOfSale], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
        }));

        
    } catch (e) {
        console.log('Error Message:', e);
        res.status(500).send('Internal Server Error');
    }
    res.send("Data inserted successfully");
});


app.get('/allTransactions', async (request, response) => {
    const { page = 1, perPage = 10 } = request.query;

    const offset = (page - 1) * perPage;
    const query = `SELECT * FROM roxiller LIMIT ${perPage} OFFSET ${offset};`;

    try {
        const result = await db.all(query);
        response.json(result);
    } catch (error) {
        console.error('Error executing query:', error);
        response.status(500).send('Internal Server Error');
    }
});





app.get('/statistics/:monthId', async (request, response) => {
    const { monthId } = request.params;

    // Add leading zero for single-digit months
    const formattedMonthId = monthId.padStart(2, '0');

    // Query to get total sale amount, total sold items, and total not sold items for the selected month
    const priceQuery = `
        SELECT 
            SUM(price) AS total_price,
            COUNT(*) AS total_sold_items,
            (SELECT COUNT(*) FROM roxiller WHERE strftime('%m', dateOfSale) = ? AND sold = 0) AS total_not_sold_items
        FROM 
            roxiller 
        WHERE 
            strftime('%m', dateOfSale) = ?;
    `;

    try {
        const result = await db.get(priceQuery, [formattedMonthId, formattedMonthId]);
        response.send(result);
    } catch (error) {
        console.error('Error executing query:', error);
        response.status(500).send('Internal Server Error');
    }
});


app.get('/barChart/:monthId', async (request, response) => {
    const { monthId } = request.params;

    // Add leading zero for single-digit months
    const formattedMonthId = monthId.padStart(2, '0');

    // Query to get price ranges and the number of items in each range for the selected month
    const barChartQuery = `
        SELECT 
            CASE
                WHEN price BETWEEN 0 AND 100 THEN '0 - 100'
                WHEN price BETWEEN 101 AND 200 THEN '101 - 200'
                WHEN price BETWEEN 201 AND 300 THEN '201 - 300'
                WHEN price BETWEEN 301 AND 400 THEN '301 - 400'
                WHEN price BETWEEN 401 AND 500 THEN '401 - 500'
                WHEN price BETWEEN 501 AND 600 THEN '501 - 600'
                WHEN price BETWEEN 601 AND 700 THEN '601 - 700'
                WHEN price BETWEEN 701 AND 800 THEN '701 - 800'
                WHEN price BETWEEN 801 AND 900 THEN '801 - 900'
                WHEN price >= 901 THEN '901-above'
            END AS price_range,
            COUNT(*) AS number_of_items
        FROM 
            roxiller 
        WHERE 
            strftime('%m', dateOfSale) = ?
        GROUP BY 
            price_range;
    `;

    try {
        const result = await db.all(barChartQuery, [formattedMonthId]);
        response.send(result);
    } catch (error) {
        console.error('Error executing query:', error);
        response.status(500).send('Internal Server Error');
    }
});


app.get('/pieChart/:monthId', async (request, response) => {
    const { monthId } = request.params;

    // Add leading zero for single-digit months
    const formattedMonthId = monthId.padStart(2, '0');

    // Query to get unique categories and the number of items in each category for the selected month
    const pieChartQuery = `
        SELECT 
            category,
            COUNT(*) AS number_of_items
        FROM 
            roxiller 
        WHERE 
            strftime('%m', dateOfSale) = ?
        GROUP BY 
            category;
    `;

    try {
        const result = await db.all(pieChartQuery, [formattedMonthId]);
        response.send(result);
    } catch (error) {
        console.error('Error executing query:', error);
        response.status(500).send('Internal Server Error');
    }
});




app.get('/combinedData/:month', async (request, response) => {
    const { month } = request.params;

    try {
        // Fetch data from the three APIs
        const transactionsData = await fetchTransactionsAPI(month);
        const statisticsData = await fetchStatisticsAPI(month);
        const pieChartData = await fetchPieChartAPI(month);

        
        const combinedData = {
            transactions: transactionsData,
            statistics: statisticsData,
            pieChart: pieChartData
        };

        response.json(combinedData);
    } catch (error) {
        console.error('Error fetching data:', error);
        response.status(500).send('Internal Server Error');
    }
});


async function fetchTransactionsAPI(month) {
    const response = await fetch(`http://localhost:4001/allTransactions?month=${month}`);
    return response.json();
}

async function fetchStatisticsAPI(month) {
    const response = await fetch(`http://localhost:4001/statistics/${month}`);
    return response.json();
}

async function fetchPieChartAPI(month) {
    const response = await fetch(`http://localhost:4001/pieChart/${month}`);
    return response.json();
}
