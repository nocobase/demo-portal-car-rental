// Prompt that lets a visitor rebuild this app from scratch with their own
// coding agent. Derived from the live data model, pages and workflows of
// this portal, so it describes what the app actually is.
// English only - it is meant to be pasted into a coding agent.

export function buildReplicatePrompt() {
  return `Build a "Car Rental" app on NocoBase with your coding agent.

What it is: a vehicle rental operation: a fleet with categories, insurance, maintenance and dispatch, customers with licences, rental orders and contracts, payments, violations and branch/staff master data.

Data model (collection - purpose; key fields):
  scm_branches - branches
      fields: status (open|closed|renovating), address, name, phone, business_hours
      relations: vehicles -> scm_vehicles, dispatch_out -> scm_dispatch, staff -> scm_staff, dispatch_in -> scm_dispatch
  scm_contracts - contracts
      fields: status (draft|signed|archived), orderId, customerId, contract_no, content, sign_date
      relations: customer -> scm_customers, attachments -> files, order -> scm_rental_orders
  scm_customers - customers
      fields: status (lead|active|churned), license_type (C1|C2|B1|A1), industry (saas|fintech|healthcare|ecommerce|manufacturing), credit_level (high|medium|low), company_name, address, license_expiry, email, phone
      relations: rental_orders -> scm_rental_orders
  scm_dispatch - assigning a vehicle to a driver/'job'
      fields: status (pending|in_transit|completed), dispatch_date, vehicleId, fromBranchId, dispatch_no, reason, toBranchId
      relations: vehicle -> scm_vehicles, to_branch -> scm_branches, from_branch -> scm_branches
  scm_insurance - insurance
      fields: type (compulsory|commercial|third_party), premium, end_date, provider, policy_number, vehicleId, start_date
      relations: vehicle -> scm_vehicles
  scm_maintenance - maintenance
      fields: type (service|repair|inspection), date, vehicleId, description, next_date, cost
      relations: vehicle -> scm_vehicles
  scm_payments - payments
      fields: status (pending|paid|refunded), payment_method (cash|wechat|alipay|card), deposit, orderId, amount, payment_time, refund
      relations: order -> scm_rental_orders
  scm_rental_orders - rental orders
      fields: cancel_reason (schedule_conflict|price_change|change_plan|vehicle_unavailable|customer_request), status (reserved|ongoing|completed|cancelled), order_no, vehicleId, expected_return, customerId, actual_return, pickup_time, daily_rate
      relations: vehicle -> scm_vehicles, customer -> scm_customers, payment -> scm_payments, violations -> scm_violations
  scm_vehicle_categories - vehicle categories
      fields: description, base_daily_rate, name
  scm_vehicles - vehicles
      fields: status (available|rented|maintenance|scrapped), categoryId, brand, branchId, model, mileage, daily_rate, color, plate_number
      relations: category -> scm_vehicle_categories, insurance_records -> scm_insurance, dispatch_records -> scm_dispatch, rental_orders -> scm_rental_orders, violations -> scm_violations, maintenance_records -> scm_maintenance
  scm_violations - violations
      fields: status (pending|processed|appealing), description, orderId, fine_amount, location, vehicleId, points, date
      relations: vehicle -> scm_vehicles, order -> scm_rental_orders

Pages:
  /dashboard — fleet and revenue overview
  /analytics/utilization, /analytics/profitability, /analytics/cashflow, /analytics/cancellation — four analysis pages
  menu groups: Fleet, Customers, Rental, Finance, Base data — each group lists its resources as CRUD pages

Workflows:
  Auto-Pickup on Reserved Time - on a schedule
  Order Completed - Generate Receivable & Archive Contract - on scm_rental_orders change
  Insurance Expiry Reminder - on a schedule
  Maintenance Due Reminder - on a schedule
  Driver License Expiry Reminder - on a schedule
  Auto-Link Violation to Order - on scm_violations change
  Overdue Return Alert - on a schedule

Seed data: about 145 rows in total, e.g. scm_rental_orders ~20, scm_payments ~20, scm_vehicles ~18.
Keep every seeded value in English.

Build in this order: data model -> pages -> workflows -> roles/permissions -> seed data.
After each page, open it and confirm it renders and its create/edit dialogs work before moving on.`;
}
