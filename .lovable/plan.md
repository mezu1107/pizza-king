

# AL Maalik Foods – Full Stack Food Ordering App

A modern, fully functional food ordering website for **AL Maalik Foods** built with React, featuring a beautiful UI with animations and a Supabase backend for data management, authentication, and orders.

---

## 🎨 Design & Branding
- **Red & yellow** color theme (primary: #c8102e, accent: #ffcc00)
- **Poppins** font for headings, **Inter** for body text
- Smooth animations (fade-in, hover scale effects, scroll animations)
- Fully responsive (mobile-first design)

---

## 📄 Pages & Sections

### 1. **Homepage**
- **Sticky Navigation Bar** – Logo, menu links (Home, Menu, Deals, Contact), cart icon with badge, Sign In button, mobile hamburger menu
- **Hero Section** – Full-screen background image with overlay, bold headline "AL Maalik Foods – Tasty & Fresh!", search bar, popular quick tags (Biryani, Burger, Pizza, Karahi, Deals)
- **Flash Deals Section** – Horizontally scrollable deal cards with discount badges, prices (old/new), "Grab Deal" buttons. Static data includes:
  - Buy 1 Get 1 Free Pizza (Rs. 999, was Rs. 1,599)
  - Burger + Fries + Drink Combo (Rs. 649)
  - Family Biryani Deal (Rs. 1,299)
  - Loaded Chicken Wings (Rs. 549)
- **Categories Section** – Grid of food category cards with hover zoom effect. Static categories: Pizza, Burgers, Biryani, Karahi, BBQ, Desserts, Drinks, Rolls
- **Popular Foods Section** – Grid of food item cards with image, title, description, star rating, price, and "Order Now" button. Static items include:
  - Chicken Biryani (Rs. 550)
  - Beef Zinger Burger (Rs. 480)
  - Pepperoni Pizza (Rs. 899)
  - Chicken Karahi (Rs. 1,200)
  - Seekh Kebab Roll (Rs. 350)
  - Chocolate Brownie (Rs. 250)

### 2. **Menu Page**
- Browse all food items by category
- Filter and search functionality
- Each item shows image, name, price, rating, and add-to-cart button

### 3. **Deals Page**
- All active deals with countdown timers
- Discount badges and pricing

### 4. **Cart & Checkout**
- View cart items, adjust quantities, remove items
- Order summary with total
- Place order (saved to database)

### 5. **Authentication**
- Sign up / Sign in pages
- User profile with order history

---

## 🗄️ Backend (Supabase)

### Database Tables
- **categories** – id, title, image_url, active, featured
- **foods** – id, title, description, price, image_url, category_id, active, featured, rating
- **deals** – id, title, description, price, old_price, discount_text, image_url, active, featured
- **orders** – id, user_id, total, status, created_at
- **order_items** – id, order_id, food_id, quantity, price
- **profiles** – id (linked to auth.users), full_name, phone, address

### Authentication
- Email/password sign up and sign in
- Protected routes for cart and order history

### Security
- Row Level Security on all tables
- Users can only view their own orders and profile

---

## 🚀 Implementation Order

1. **Set up design system** – Colors, fonts, animations, and base layout
2. **Build Homepage** – Header, Hero, Flash Deals, Categories, Popular Foods (all with static data)
3. **Connect Supabase** – Set up database tables and seed with the static food data
4. **Add Authentication** – Sign up, sign in, user profiles
5. **Build Menu & Deals pages** – Dynamic data from database
6. **Add Cart functionality** – Add to cart, view cart, adjust quantities
7. **Build Checkout & Orders** – Place order, order history
8. **Footer** – Contact info, social links, quick navigation

