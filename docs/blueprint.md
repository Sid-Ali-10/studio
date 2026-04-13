# **App Name**: GetMeDZ

## Core Features:

- Secure User Authentication: Allow users to register and log in securely with email and password. Ensures persistent sessions and restricts access to application content until authenticated.
- Dynamic Listing Board: Users can create and view two types of listings: 'Traveler' (details like origin city, date, luggage space) and 'Buyer' (product name, max price). Listings are displayed with infinite scrolling, and users can rate and favorite entries.
- In-App Private Chat: Facilitate real-time, private messaging between travelers and buyers. Supports sending and receiving text messages, along with image uploads through Firebase Storage for detailed communication.
- Comprehensive User Profile: Displays user-specific information including username, average star rating (from 1 to 5), the total number of successful deals, and a 'verified' badge for trusted accounts.
- Firebase Backend Integration: Utilizes Firebase for all backend services: Firebase Authentication for user management, Firestore for storing structured data (users, listings, chats, ratings, favorites), and Firebase Storage for media like uploaded images.
- Responsive User Interface: Ensures the application is fully responsive, providing an optimal viewing and interaction experience across all devices, including desktops, tablets, and mobile phones.

## Style Guidelines:

- Color Palette Rationale: Inspired by the idea of 'vibrant market connections' and the dynamic exchange between travelers and buyers. A clean, light aesthetic supports an easy-to-read marketplace interface, emphasizing trust and modernity.
- Primary color: A mid-tone, slightly desaturated blue (#3380CC) to convey trustworthiness, modernity, and a sense of connection.
- Background color: A very light, almost off-white blue-gray (#F0F2F5), offering a clean and expansive canvas for content, maintaining visual harmony with the primary color.
- Accent color: A vibrant cyan (#52E0E0), providing a clear and energetic contrast for call-to-action buttons, interactive elements, and key highlights.
- Body and headline font: 'Inter', a modern sans-serif typeface, chosen for its excellent legibility across all screen sizes and its clean, professional appearance suitable for both headlines and detailed text blocks in a marketplace setting.
- Utilize a consistent set of clean, minimalist icons for navigation and actions, such as user profiles, message bubbles, stars for ratings, and icons representing travel or products, ensuring clarity and ease of use.
- Implement a fully responsive grid-based layout for listings to ensure adaptability across devices. Include dedicated, streamlined layouts for login/signup pages, private chat interfaces, and detailed user profiles.
- Integrate subtle animations for smooth page transitions (e.g., a splash screen fade-in), infinite scroll loading indicators, and engaging hover effects for interactive elements to enhance user feedback and overall experience.