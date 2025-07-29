# User Guide - Freelance Contract Platform

## 🎯 Main User Flows

### Flow 1: Freelancer Creates and Sends Contract

```
Homepage → Sign Up/Login → Dashboard → Create Contract
    ↓
Choose Method: AI Generate or Upload PDF
    ↓
Add Signature Fields (drag & drop)
    ↓
Invite Client (enter email)
    ↓
Client receives invite link → Reviews → Signs
    ↓
Contract stored on blockchain
```

### Flow 2: Create and Send Invoice

```
Contracts → Select Signed Contract → Create Invoice
    ↓
Add Invoice Items & Payment Details
    ↓
Set Payment Schedule (one-time or milestones)
    ↓
Choose Payment Method (crypto/fiat)
    ↓
Send to Client → Client Pays → Auto-tracked
```

## 🖥️ Screen-by-Screen Guide

### 1. Homepage (/)
- **What you see**: Landing page with glassmorphism design
- **Actions**: Sign Up or Login

### 2. Dashboard (/dashboard)
- **What you see**: Overview of your contracts, invoices, and payments
- **Key metrics**: Active contracts, pending signatures, unpaid invoices
- **Quick actions**: Create Contract, View All Contracts

### 3. Contracts Page (/contracts)
- **What you see**: List of all your contracts
- **Status indicators**: 
  - 🟡 Draft
  - 🟠 Pending Signatures
  - 🟢 Fully Signed
- **Actions**: Create New, View Details, Create Invoice

### 4. Create Contract (/contracts/create)
- **Option 1 - AI Generation**:
  - Select contract type
  - Fill in details (parties, scope, payment)
  - AI generates professional contract
  
- **Option 2 - Upload PDF**:
  - Drag & drop your PDF
  - System processes it automatically

### 5. Add Fields (PDF Editor)
- **Signature fields**: Drag to where signatures needed
- **Text fields**: For names, dates, initials
- **Assign to parties**: Creator or Signer
- **Save**: Stores on blockchain

### 6. Invite Signers (/contracts/[id]/invite)
- **Add participants**: Name and email
- **Set roles**: Who signs what
- **Send invites**: Email with secure link

### 7. Contract Detail (/contracts/[id])
- **View**: Full contract with fields
- **Track**: Who has signed, who hasn't
- **Download**: PDF with signatures
- **Actions**: Create Invoice, Send Reminder

### 8. Invoice Creation (/contracts/[id]/invoice/create)
- **Templates**: 
  - One-time payment
  - 50/50 split
  - Milestone-based
- **Details**: Items, quantities, prices
- **Payment**: Crypto wallet or traditional

### 9. Invoice Detail (/invoices/[id])
- **Status**: Paid/Unpaid/Overdue
- **Payment link**: Share with client
- **Track**: Payment history
- **Export**: PDF invoice

## 💡 Pro Tips

### For Freelancers
1. **Use AI contracts** for standard agreements - saves time
2. **Set up payment schedules** to get paid in stages
3. **Enable crypto payments** for international clients
4. **Use secure rooms** for sensitive negotiations

### For Clients
1. **Review carefully** before signing - it's legally binding
2. **Check blockchain record** for authenticity
3. **Pay on time** to maintain good relationship
4. **Download copies** for your records

## 🔐 Security Features

- **End-to-end encryption**: All documents encrypted
- **Blockchain storage**: Tamper-proof records
- **Digital signatures**: Cryptographically secure
- **Secure rooms**: Private communication channels

## ⚡ Quick Actions

### Keyboard Shortcuts (when available)
- `Cmd/Ctrl + N`: New contract
- `Cmd/Ctrl + S`: Save draft
- `Esc`: Close modals

### Mobile Usage
- Fully responsive design
- Sign documents on mobile
- Review contracts anywhere
- Get push notifications (coming soon)

## 🆘 Common Issues

### "Cannot sign document"
- Make sure you're logged in
- Check if you have signing permissions
- Refresh the page

### "Payment not showing"
- Blockchain confirmations take time
- Check transaction on block explorer
- Contact support if > 1 hour

### "Cannot upload PDF"
- Max size: 10MB
- Supported: PDF only
- Try compressing the file

## 📞 Getting Help

- **In-app help**: Click the ? icon
- **Documentation**: /docs (coming soon)
- **Support email**: support@yourplatform.com
- **Response time**: Within 24 hours