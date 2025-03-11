const mongoose = require('mongoose');

const statistics_schema = new mongoose.Schema({
    doc_type: { type: String, default: 'admin' },
    no_of_admins: { type: Number, default: 0 },
    no_of_active_admins: { type: Number, default: 0 },
    no_of_blocked_admins: { type: Number, default: 0 },
    no_of_users: { type: Number, default: 0 },
    no_of_active_users: { type: Number, default: 0 },
    no_of_blocked_users: { type: Number, default: 0 },
    no_of_delivery_agents: { type: Number, default: 0 },
    no_of_active_delivery_agents: { type: Number, default: 0 },
    no_of_blocked_delivery_agents: { type: Number, default: 0 },
    no_of_fleet_managers: { type: Number, default: 0 },
    no_of_active_fleet_managers: { type: Number, default: 0 },
    no_of_blocked_fleet_managers: { type: Number, default: 0 },
    total_pending_registrations: { type: Number, default: 0 },
    total_deliveries: { type: Number, default: 0 },
    total_instant_deliveries: { type: Number, default: 0 },
    total_scheduled_deliveries: { type: Number, default: 0 },
    total_completed_deliveries: { type: Number, default: 0 },
    total_successful_deliveries: { type: Number, default: 0 },
    total_cancelled_deliveries: { type: Number, default: 0 },
    total_cancelled_deliveries_by_users: { type: Number, default: 0 },
    total_cancelled_deliveries_by_delivery_agents: { type: Number, default: 0 },
    total_declined_deliveries_by_delivery_agents: { type: Number, default: 0 },
    total_failed_deliveries: { type: Number, default: 0 },
    total_user_reports: { type: Number, default: 0 },
    total_delivery_agent_reports: { type: Number, default: 0 },
    total_reports: { type: Number, default: 0 },
    total_pending_reports: { type: Number, default: 0 },
    total_resolved_reports: { type: Number, default: 0 },
    total_revenue: { type: Number, default: 0 },
    total_pickload_earnings: { type: Number, default: 0 },
    total_delivery_agent_earnings: { type: Number, default: 0 },
    total_fleet_manager_earnings: { type: Number, default: 0 },
    total_individual_agent_earnings: { type: Number, default: 0 },
    total_daily_transactions: { type: Number, default: 0 },
    total_weeekly_transactions: { type: Number, default: 0 },
    total_monthly_transactions: { type: Number, default: 0 },
    total_yearly_transactions: { type: Number, default: 0 },
    total_refunded_amount: { type: Number, default: 0 },

    pickup_radius: { type: Number, default: 50000 },
    pickload_percent: { type: Number, default: 15 },
    refund_percent: { type: Number, default: 50 },
    refund_percent_delivery_agent: { type: Number, default: 50 },
    active_delivery_mediums: {
        bike: { type: Boolean, default: true },
        car: { type: Boolean, default: true },
        van: { type: Boolean, default: true },
        truck: { type: Boolean, default: true }
    },
    base_fare: {
        bike: { type: Number, default: 200 },
        car: { type: Number, default: 500 },
        van: { type: Number, default: 600 },
        truck: { type: Number, default: 1000 }
    },
    km_rate: {
        bike: { type: Number, default: 50 },
        car: { type: Number, default: 80 },
        van: { type: Number, default: 120 },
        truck: { type: Number, default: 200 }
    },
    time_rate: {
        bike: { type: Number, default: 25 },
        car: { type: Number, default: 50 },
        van: { type: Number, default: 80 },
        truck: { type: Number, default: 110 }
    },
    min_price: {
        bike: { type: Number, default: 1000 },
        car: { type: Number, default: 1500 },
        van: { type: Number, default: 2000 },
        truck: { type: Number, default: 5000 }
    },
    request_timeout_duration: { type: Number, default: 2 },
    payment_timeout_duration: { type: Number, default: 10 },
    refund_days: { type: Number, default: 15 },
    target_daily_deliveries: { type: Number, default: 0 },
    target_weekly_deliveries: { type: Number, default: 0 },
    no_of_referees: { type: Number, default: 0 },
    no_completed_orders_per_referee: { type: Number, default: 0 },
    reward_notifier: { type: String, default: "airtime" },
    discount_percentage: { type: Number, default: 15 },
    discount_enabled: { type: Boolean, default: true }
}, { collections: 'statistics' });

const model = mongoose.model('Statistics', statistics_schema);
module.exports = model