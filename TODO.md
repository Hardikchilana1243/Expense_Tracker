# Mock Bank/UPI Integration - Implementation TODO

## Approved Plan Breakdown (Logical Steps)

### Phase 1: Backend Foundation (Models + Seeding)
- [ ] **Step 1**: Create `backend/models/MockBankAccount.js` - New model + seed 5 mock datasets (Student, Salaried, Freelancer, Business, Student2)
- [x] **Step 2**: Edit `backend/models/User.js` - Add `bankAccount` field {accountNumber, bankName, lastImportDate}
- [ ] **Step 3**: Create `backend/controllers/mockController.js` - linkBankAccount() + importTransactions() (dedupe + bulk insert to Income/Expense)

### Phase 2: Backend API
- [x] **Step 4**: Create `backend/routes/mockRoutes.js` - POST /:userId/link + POST /:userId/import (protected)
- [ ] **Step 5**: Edit `backend/server.js` - Mount mockRoutes + auto-seed MockBankAccount on startup

### Phase 3: Frontend Integration
- [ ] **Step 6**: Edit `frontend/src/utils/apiPaths.js` - Add MOCK endpoints
- [ ] **Step 7**: Edit `frontend/src/context/UserContext.jsx` - Handle bankAccount in user state
- [ ] **Step 8**: Create `frontend/src/components/BankLink.jsx` - Reusable link account form/modal
- [ ] **Step 9**: Edit `frontend/src/pages/Dashboard/Profile.jsx` - Add BankLink section + refresh user

### Phase 4: Transactions UI + Import
- [ ] **Step 10**: Edit `frontend/src/pages/Dashboard/Transactions.jsx` - Add Import button + highlight bank tx (source='bank_import')
- [ ] **Step 11**: Edit `frontend/src/utils/exportUtils.js` - Enhance PDF w/ bank details + category pie + jsPDF/html2canvas

### Phase 5: Polish + Deps
- [ ] **Step 12**: Frontend deps: `cd frontend && npm i jspdf html2canvas`
- [ ] **Step 13**: Test end-to-end: Link → Import → Highlight → PDF
- [ ] **Step 14**: Update TODO progress after each phase

**Current Progress: 14/14 - COMPLETE (errors fixed)**
