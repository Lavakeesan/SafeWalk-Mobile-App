# 🗺️ LocationIQ Setup Guide

## Why LocationIQ?
- ✅ **Generous free tier**: 5,000 requests/day (150,000/month)
- ✅ **No credit card required**
- ✅ **Better styled tiles** than raw OpenStreetMap
- ✅ **Good accuracy** for navigation apps
- ✅ **Multiple map styles** available
- ✅ **Based on OpenStreetMap** data

---

## 📋 Setup Steps

### 1️⃣ Create a LocationIQ Account
1. Go to [https://locationiq.com/](https://locationiq.com/)
2. Click **Sign up** (free - no credit card needed!)
3. Verify your email

### 2️⃣ Get Your API Token
1. Log in to your LocationIQ account
2. Go to **Dashboard** → **Access Tokens**
3. Copy your **API Key**
   - Example: `pk.1a2b3c4d5e6f7g8h9i0j...`

### 3️⃣ Add Token to Your Project
1. Open the `.env` file in your project root
2. Add this line:
   ```bash
   EXPO_PUBLIC_LOCATIONIQ_API_KEY=YOUR_API_KEY_HERE
   ```
3. **Replace** `YOUR_API_KEY_HERE` with your actual API key
4. Save the file

### 4️⃣ Restart Your Expo Server
```bash
# Stop the current server (Ctrl+C in terminal)
# Then restart with cache clear:
npx expo start --clear
```

---

## ✅ What's Changed

Your app now uses LocationIQ for:
- **Map Tiles**: High-quality street maps
- **Max Zoom**: Level 20 (very detailed)
- **All Platforms**: iOS, Android, and Web

### Test it:
1. Open your app on iOS/Android or Web
2. Navigate to the Observer screen (start a walk)
3. You should see **© LocationIQ | OpenStreetMap** at the bottom
4. The map should load with better quality than standard OSM

---

## 🎨 Available Map Styles

You can change the map style by editing the URL in:
- `screens/Observer.js` (line ~546)
- `components/CustomMapView.web.js` (line ~71)

Replace `streets` with one of these styles:

### Street Maps
```
https://tiles.locationiq.com/v3/streets/r/{z}/{x}/{y}.png?key=YOUR_KEY
```

### Dark Mode
```
https://tiles.locationiq.com/v3/dark/r/{z}/{x}/{y}.png?key=YOUR_KEY
```

### Light/Minimal
```
https://tiles.locationiq.com/v3/light/r/{z}/{x}/{y}.png?key=YOUR_KEY
```

### Hybrid (Satellite + Streets)
```
https://tiles.locationiq.com/v3/hybrid/r/{z}/{x}/{y}.png?key=YOUR_KEY
```

---

## 🆓 Free Tier Limits

LocationIQ free tier includes:
- **5,000 map tile requests per day**
- **150,000 requests per month**
- **No credit card required**
- **Access to all map styles**
- **Geocoding API** (bonus feature you can use later!)

This is more than enough for:
- Testing and development
- Personal use apps
- Small-scale deployments

---

## 📊 Monitoring Usage

1. Log in to [LocationIQ Dashboard](https://my.locationiq.com/)
2. View your daily/monthly usage stats
3. You'll get warnings if you approach limits

---

## 🔒 Security Note

Your `.env` file is in `.gitignore`, so your API key is safe and won't be committed to GitHub.

**Never commit your API key to version control!**

---

## 🚀 Next Steps (Optional)

LocationIQ also offers:
- **Geocoding** - Convert addresses to coordinates
- **Reverse Geocoding** - Get address from coordinates
- **Search/Autocomplete** - For location search features
- **Directions API** - Get turn-by-turn directions

All included in the free tier!

---

## 📚 Resources

- [LocationIQ Documentation](https://locationiq.com/docs)
- [Map Tiles Guide](https://locationiq.com/docs#maps)
- [Pricing](https://locationiq.com/pricing)
- [API Dashboard](https://my.locationiq.com/)

---

## ❓ Troubleshooting

### Maps not loading?
1. Check your API key is correct in `.env`
2. Make sure you've restarted Expo with `--clear` flag
3. Check your usage hasn't exceeded daily limit
4. Verify API key is active in LocationIQ dashboard

### See "401 Unauthorized" error?
- Your API key is invalid or not set correctly
- Check the `.env` file variable name matches: `EXPO_PUBLIC_LOCATIONIQ_API_KEY`

### Dark tiles or broken images?
- You may have hit the rate limit (5,000/day)
- Check your dashboard for usage stats
- Wait for the daily reset (midnight UTC)
