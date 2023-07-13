const express = require("express");
const app = express();
const mongoose = require("mongoose");

const MONGOURI =
  "mongodb+srv://harshpandit2004:harambedidnothingwrong@technokartbank.lutnaox.mongodb.net/";

const port = 9000;

// CORS middleware
app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// MongoDB connection setup
mongoose.connect(MONGOURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
mongoose.connection.on("connected", () => {
  console.log("DB connected.");
});
mongoose.connection.on("error", (error) => {
  console.log(error);
});

// Invoice schema and model
const invoiceSchema = new mongoose.Schema({
  invoiceDate: {
    type: Date,
    required: true,
  },
  invoiceNumber: {
    type: Number,
    required: true,
  },
  invoiceAmount: {
    type: Number,
    required: true,
  },
  financialYear: {
    type: String,
    required: true,
  },
});

const Invoice = mongoose.model("Invoice", invoiceSchema);

// Function to determine the financial year based on the invoice date
function getFinancialYear(invoiceDate) {
  const year = invoiceDate.getFullYear();
  const month = invoiceDate.getMonth() + 1;
  const financialYear =
    month >= 4 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
  return financialYear;
}

app.use(express.json());

app.get("/", (req, res) => {
  console.log("The server was triggered");
  res.send("Yes, the server was triggered");
});

// Endpoint to handle POST requests for invoices
app.post("/invoices", async (req, res) => {
  const { invoiceDate, invoiceNumber, invoiceAmount } = req.body;

  // Validate the presence of all three parameters
  if (!invoiceDate || isNaN(invoiceNumber) || !invoiceAmount) {
    return res.status(400).json({ error: "All parameters are required." });
  }

  // Determine the financial year based on the invoice date
  const financialYear = getFinancialYear(new Date(invoiceDate));

  // Get the current year
  const currentYear = new Date().getFullYear();

  try {
    // Find the previous and next invoices based on the invoice number
    const previousInvoice = await Invoice.findOne({
      invoiceNumber: { $lt: invoiceNumber },
    }).sort({ invoiceNumber: -1 });

    let prevDate = null;
    if (previousInvoice) {
      prevDate = previousInvoice.invoiceDate.toISOString();
    }

    const nextInvoice = await Invoice.findOne({
      invoiceNumber: { $gt: invoiceNumber },
    }).sort({ invoiceNumber: 1 });

    let nextDate = null;
    if (nextInvoice) {
      nextDate = nextInvoice.invoiceDate.toISOString();
    }

    console.log(prevDate, nextDate);

    // Validate the invoice date falls within the previous and next invoice dates
    if (prevDate > invoiceDate || nextDate < invoiceDate) {
      return res.status(400).json({
        error:
          "Invoice date should be between the invoice dates of the previous and next invoice numbers.",
      });
    }

    // Check if an invoice with the same invoice number and financial year already exists
    const existingInvoice = await Invoice.findOne({
      invoiceNumber,
      financialYear,
    });

    if (existingInvoice) {
      return res.status(409).json({
        error:
          "An invoice with the same invoice number and financial year already exists.",
      });
    }

    // Check if the invoice date is within the current year
    if (new Date(invoiceDate).getFullYear() !== currentYear) {
      return res.status(400).json({
        error: "Invoice date should be within the current year.",
      });
    }

    // Create a new invoice document
    const invoice = new Invoice({
      invoiceDate,
      invoiceNumber,
      invoiceAmount,
      financialYear,
    });

    // Save the invoice to the database
    await invoice.save();

    // Send a response
    res.json({ message: "Invoice processed and saved successfully." });
  } catch (error) {
    console.error("Error saving invoice:", error);
    res
      .status(500)
      .json({ error: "An error occurred while saving the invoice." });
  }
});

app.listen(port, () => {
  console.log(`Server is live at port ${port}`);
});
