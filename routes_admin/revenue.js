const express = require('express');
const jwt = require('jsonwebtoken');

const Admin = require('../models/admin');
const Transaction = require('../models/transaction');
const Statistics = require('../models/statistics');

const router = express.Router();

// Endpoint to view total revenue
router.post('/revenue', async (req, res) => {
    const { token } = req.body;

    if(!token) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);

        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }

        let revenue = await Statistics.findOne({ doc_type: 'admin' })
        .select([ 'total_delivery_agent_earnings', 'total_individual_agent_earnings', 'total_fleet_manager_earnings', 'total_revenue', 'total_pickload_earnings', 'total_refunded_amount' ])
        .lean();

        let yellow = Math.round((revenue.total_pickload_earnings / revenue.total_revenue) * 100);
        let blue = Math.round((revenue.total_individual_agent_earnings / revenue.total_revenue) * 100);
        let red = 100 - yellow - blue;

        let percentages = {
            pickload_percent: yellow,
            individual_agents_percent: blue,
            fleet_managersagers_percent: red
        }

        return res.status(200).send({ status: 'ok', msg: 'Success', revenue, percentages });
    } 
    
    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

// Endpoint to view monthly revenue
router.post('/monthly_revenue', async (req, res) => {
    const { token, month, year } = req.body;

    if(!token || !month || !year) {
        return res.status(400).send({ status: 'error', msg: 'All fields must be entered' });
    }

    try {
        let admin = jwt.verify(token, process.env.JWT_SECRET);
        
        admin = await Admin.findOne({ _id: admin._id }).select([ '-password' ]).lean();

        if(admin.status != true) {
            return res.status(400).send({ status: 'error', msg: 'Account has been blocked, please contact master admin' });
        }
        
        // Getting all transaction documents for the input month
        let transactions = await Transaction.find({
            month, year
        })
        .select([ 'amt', 'amt_for_delivery_agent', 'to_fleet', 'week' ])
        .lean();

        if(transactions.length == 0) {
            return res.status(200).send({ status: 'ok', msg: 'No transaction was made in this month' })
        }

        let total_pickload = 0, total_individual_agent = 0, total_fleet = 0;
        let firstWeek, secondWeek, thirdWeek, fourthWeek, fifthWeek;

        transactions.forEach((transaction) => {
            if(transaction.week == 1) {
                total_pickload = 0, total_individual_agent = 0, total_fleet = 0;

                total_pickload +=  (transaction.amt - transaction.amt_for_delivery_agent);

                if(transaction.to_fleet == false) {
                    total_individual_agent += transaction.amt_for_delivery_agent
                }

                if(transaction.to_fleet == true) {
                    total_fleet += transaction.amt_for_delivery_agent
                }

                firstWeek = {
                    pickload_earnings: total_pickload,
                    individual_agents_earnings: total_individual_agent,
                    fleet_managers_earnings: total_fleet
                }
            }

            if(transaction.week == 2) {
                total_pickload = 0, total_individual_agent = 0, total_fleet = 0;

                total_pickload +=  (transaction.amt - transaction.amt_for_delivery_agent);

                if(transaction.to_fleet == false) {
                    total_individual_agent += transaction.amt_for_delivery_agent
                }

                if(transaction.to_fleet == true) {
                    total_fleet += transaction.amt_for_delivery_agent
                }

                secondWeek = {
                    pickload_earnings: total_pickload,
                    individual_agents_earnings: total_individual_agent,
                    fleet_managers_earnings: total_fleet
                }
            }

            if(transaction.week == 3) {
                total_pickload = 0, total_individual_agent = 0, total_fleet = 0;
                
                total_pickload +=  (transaction.amt - transaction.amt_for_delivery_agent);

                if(transaction.to_fleet == false) {
                    total_individual_agent += transaction.amt_for_delivery_agent
                }

                if(transaction.to_fleet == true) {
                    total_fleet += transaction.amt_for_delivery_agent
                }

                thirdWeek = {
                    pickload_earnings: total_pickload,
                    individual_agents_earnings: total_individual_agent,
                    fleet_managers_earnings: total_fleet
                }
            }

            if(transaction.week == 4) {
                total_pickload = 0, total_individual_agent = 0, total_fleet = 0;
                
                total_pickload +=  (transaction.amt - transaction.amt_for_delivery_agent);

                if(transaction.to_fleet == false) {
                    total_individual_agent += transaction.amt_for_delivery_agent
                }

                if(transaction.to_fleet == true) {
                    total_fleet += transaction.amt_for_delivery_agent
                }

                fourthWeek = {
                    pickload_earnings: total_pickload,
                    individual_agents_earnings: total_individual_agent,
                    fleet_managers_earnings: total_fleet
                }
            }

            if(transaction.week == 5) {
                total_pickload = 0, total_individual_agent = 0, total_fleet = 0;
                
                total_pickload +=  (transaction.amt - transaction.amt_for_delivery_agent);

                if(transaction.to_fleet == false) {
                    total_individual_agent += transaction.amt_for_delivery_agent
                }

                if(transaction.to_fleet == true) {
                    total_fleet += transaction.amt_for_delivery_agent
                }

                fifthWeek = {
                    pickload_earnings: total_pickload,
                    individual_agents_earnings: total_individual_agent,
                    fleet_managers_earnings: total_fleet
                }
            }
        });

        let message = 'No transaction was made in this week';

        let monthly_revenue = {
            week_1: firstWeek || message,
            week_2: secondWeek || message,
            week_3: thirdWeek || message,
            week_4: fourthWeek || message,
            week_5: fifthWeek || message
        }
       
        return res.status(200).send({ status: 'ok', msg: 'Success', monthly_revenue });

    } 
    
    catch(error) {
        console.log(error);
        return res.status(400).send({ status: 'error', msg: 'Some error occurred', error });
    }
});

module.exports = router