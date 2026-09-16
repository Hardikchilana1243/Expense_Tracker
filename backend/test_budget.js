const mongoose = require("mongoose");
const Budget = require("./models/Budget");

mongoose.connect("mongodb://localhost:27017/expense-tracker", { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    try {
      const budget = await Budget.findOneAndUpdate(
        { userId: new mongoose.Types.ObjectId("60b9b0b9b0b9b0b9b0b9b0b9"), category: "Food", month: 4, year: 2026 },
        { limit: 5000, month: 4, year: 2026 },
        { upsert: true, new: true, runValidators: true }
      );
      console.log("Success:", budget);
    } catch (err) {
      console.error("Error:", err);
    } finally {
      mongoose.disconnect();
    }
  });
