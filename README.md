# GetMeDZ

**GetMeDZ** is a simple peer‑to‑peer (P2P) marketplace for Algeria. It connects travelers (Carriers) flying from abroad (e.g., France) to Algeria with local Buyers who need products that are unavailable or too expensive locally.

The app works like **Binance P2P**, but for physical goods and parcels. The platform acts as a trust anchor using ratings, internal chat, and user profiles – no payment handling.

## Core Features

1. **Listings Board**  
   - Travelers post trip offers: *"I'm arriving from Paris on [date], I have spare luggage space."*  
   - Buyers post product requests: *"I want [product name], max price [amount]."*

2. **Secure In‑App Chat**  
   - Private chat for price negotiation, product details, and delivery location agreement.  
   - No external contact info shared unless both parties agree.
   - **New:** Support for replies and emoji reactions.

3. **User Profile & Ratings**  
   - Shows name, star rating, number of successful deals, and verification badge.

4. **Sign‑in**  
   - Email/Password authentication with verification.

## Technical Stack

- **Programming Languages:** TypeScript, TSX, CSS (Tailwind).
- **Frameworks:** Next.js 15 (App Router), React 19.
- **Styling:** Tailwind CSS, ShadCN UI.
- **Backend:** Firebase (Authentication, Firestore, Storage).
- **AI Integration:** Genkit with Gemini 2.5 Flash.
- **Icons:** Lucide React.

## Goal

Provide a simple, trusted, and organized way for Algerians to use spare luggage space for mutual benefit – a professional version of *"jibli maak"* (bring with you).

To get started, take a look at src/app/page.tsx.
