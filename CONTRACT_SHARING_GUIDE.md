# How to Share Contracts for Signing (Manual Process)

Since email sending is not yet implemented, here's how to share contracts with clients:

## Step 1: Create Your Contract

1. Go to **Contracts** → **Create New**
2. Either:
   - **Generate with AI**: Fill in details and let AI create it
   - **Upload PDF**: Upload your existing contract
3. Add signature fields where needed
4. Save the contract

## Step 2: Get the Shareable Link

### Method 1: During Invitation Flow
1. Click **"Invite Signers"** on your contract
2. Enter client details:
   - Name: Your client's name
   - Email: Their email (for your reference)
3. **The review link appears automatically** below their info
4. Click the **copy icon** (📋) next to the link
5. The link is now in your clipboard!

### Method 2: Copy All Links
1. Add all signers' information
2. Click **"Copy All Links"** button at the top
3. You'll get all links in this format:
   ```
   John Doe: https://your-app.vercel.app/contracts/review/abc123...
   Jane Smith: https://your-app.vercel.app/contracts/review/xyz789...
   ```

## Step 3: Send to Your Client

### Email Template
```
Subject: Contract Ready for Your Review and Signature

Hi [Client Name],

The contract for [Project Name] is ready for your review and signature.

Please click the link below to:
- Review the contract terms
- Sign electronically
- Download a copy for your records

Review and Sign: [PASTE LINK HERE]

This link is secure and unique to you. The contract is encrypted and will be stored on the blockchain once signed.

Let me know if you have any questions!

Best regards,
[Your Name]
```

### Other Sharing Methods:
- **Slack/Discord**: Share the link in a DM
- **WhatsApp**: Send as a message
- **Text/SMS**: For mobile-friendly signing

## Step 4: Track Signature Status

1. Go to **Contracts** → Select your contract
2. You'll see real-time status:
   - 🟡 **Pending**: Waiting for signature
   - ✅ **Signed**: Client has signed
3. You'll see the exact time they signed

## What Your Client Sees

When they click the link:
1. **Contract Review Page** - Full contract with highlighted signature fields
2. **No Login Required** - They can sign immediately
3. **Sign Button** - Click to add their signature
4. **Download Option** - Get a PDF copy after signing

## Security Features

- **Unique Links**: Each signer gets a unique, secure link
- **Encryption**: All data is encrypted end-to-end
- **Blockchain**: Signatures are permanently recorded
- **Tamper-Proof**: Any changes invalidate signatures

## Pro Tips

1. **Test First**: Send yourself a test contract to see the client experience
2. **Follow Up**: If not signed within 24-48 hours, send a reminder
3. **Multiple Signers**: Each person needs their own unique link
4. **Link Expiry**: Links don't expire, but you can revoke access if needed

## Common Issues

### "Link doesn't work"
- Make sure you copied the complete link
- Check if there are any spaces or line breaks
- Try copying again with the copy button

### "Can't see signature fields"
- Ensure you saved the contract after adding fields
- Refresh the page
- Try a different browser

### "Already signed by someone else"
- Each signer needs their unique link
- Don't share the same link with multiple people

## Future: Automated Emails

Email automation is planned for a future update. For now, this manual process ensures you have full control over:
- When invitations are sent
- What message accompanies the link
- Follow-up timing

## Quick Checklist

- [ ] Contract created and saved
- [ ] Signature fields added
- [ ] Client information entered
- [ ] Link copied from the platform
- [ ] Email/message composed
- [ ] Link pasted and sent
- [ ] Monitor for signature completion