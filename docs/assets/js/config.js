/**
 * JobInfo – Frontend Configuration
 * Change JOBINFO_API_URL to your deployed backend URL before going live.
 * During local development use: http://localhost:8080
 */
const JOBINFO_CONFIG = {
  // Local testing URL (Don't forget to change back before pushing to GitHub!)
  API_URL: "http://127.0.0.1:8080",  
  
  // Your Meta Dev Test Number (with country code, no +)
  BUSINESS_WA: "15556392992", 
  
  WA_CHANNEL: "https://whatsapp.com/channel/0029VawvIr34yltJoSTKit3Z",
  WA_COMMUNITY: "https://chat.whatsapp.com/LB8rI0BPgBTIMIhJAWAeMd",

  BUSINESS_TYPES: {
    "shop_retail": "Shop / Retail",
    "hotel_bakery": "Hotel / Bakery",
    "contractor": "Contractor / Builder",
    "individual": "Individual / Household",
    "petrol_pump": "Petrol Pump",
    "workshop_garage": "Workshop / Garage",
    "transport": "Transport / Logistics",
    "agency": "Agency / Consultancy",
    "company": "Company / Pvt Ltd",
    "other": "Other"
  }
};
