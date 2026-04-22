# FixPro Mobile App

React Native mobile version of the FixPro service marketplace application.

## Features

- User authentication (login/register)
- Service category browsing
- Worker profiles and ratings
- Reservation management
- Profile management
- Real-time updates

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI (install with `npm install -g expo-cli`)
- Android Studio / Xcode (for building native apps)
- Expo Go app on your mobile device (for testing)

## Installation

1. Navigate to the mobile directory:
```bash
cd mobile
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with the Expo Go app on your mobile device, or press:
   - `a` to run on Android emulator
   - `i` to run on iOS simulator
   - `w` to run in web browser

## Configuration

Create a `.env` file in the root directory with the following content:

```
EXPO_API_URL=http://localhost:3001/api
```

Make sure your backend API is running and accessible from your device/emulator.

## Project Structure

```
mobile/
├── App.js                 # Main application entry point
├── app.json              # Expo configuration
├── package.json          # Dependencies
├── babel.config.js       # Babel configuration
├── .env                  # Environment variables
├── src/
│   ├── pages/           # Screen components
│   │   ├── AuthPage.js
│   │   ├── UserHomePage.js
│   │   ├── ReservationsPage.js
│   │   ├── ProfilePage.js
│   │   ├── ServiceWorkersPage.js
│   │   ├── ReservationDetails.js
│   │   ├── WorkerProfile.js
│   │   ├── WorkerDashboard.js
│   │   ├── OrderTracking.js
│   │   ├── RatingPage.js
│   │   └── MessagesPage.js
│   ├── components/      # Reusable components
│   ├── context/         # React Context providers
│   │   └── AuthContext.js
│   ├── services/        # API services
│   │   └── api.js
│   └── navigation/      # Navigation configuration
│       └── AppNavigator.js
└── assets/             # Static assets
```

## API Integration

The app uses the same API endpoints as the web frontend. All API calls are handled through the `apiService` in `src/services/api.js`.

## Available Screens

- **AuthPage**: Login and registration for users and workers
- **UserHomePage**: Main dashboard with service categories and recommended workers
- **ReservationsPage**: View and manage user reservations
- **ProfilePage**: User profile management
- **ServiceWorkersPage**: Browse workers by category
- **ReservationDetails**: Book a service with a worker
- **WorkerProfile**: View worker details (placeholder)
- **WorkerDashboard**: Worker-specific dashboard (placeholder)
- **OrderTracking**: Track reservation progress (placeholder)
- **RatingPage**: Rate workers after service completion (placeholder)
- **MessagesPage**: In-app messaging (placeholder)

## Development

### Running on Physical Device

1. Install Expo Go on your mobile device
2. Run `npm start`
3. Scan the QR code displayed in the terminal

### Running on Emulator

- Android: Press `a` in the terminal after starting the dev server
- iOS: Press `i` in the terminal (requires macOS)

### Building for Production

To build a standalone app:

```bash
# Android
eas build --platform android

# iOS
eas build --platform ios
```

Note: You need to set up EAS (Expo Application Services) first.

## Styling

The app uses React Native's StyleSheet API for styling. The design follows the same visual style as the web frontend with:
- Gradient backgrounds
- Rounded corners
- Shadow effects
- Consistent color scheme
- Mobile-optimized layouts

## Dependencies

Key dependencies include:
- `expo`: React Native framework
- `react-navigation`: Navigation library
- `@react-native-async-storage/async-storage`: Local storage
- `@expo/vector-icons`: Icon library
- `axios`: HTTP client (optional, currently using fetch)

## Troubleshooting

### Network Issues

If the app can't connect to the API:
1. Ensure your backend is running
2. Check the API URL in `.env`
2. For physical devices, use your computer's IP address instead of `localhost`
3. Make sure your firewall allows connections

### Metro Bundler Issues

If you encounter Metro bundler issues:
```bash
npm start -- --clear
```

### Cache Issues

Clear the cache:
```bash
npx expo start -c
```

## Future Enhancements

- Complete all placeholder pages
- Add push notifications
- Implement real-time messaging
- Add payment integration
- Implement geolocation features
- Add offline support

## License

This project is part of the FixPro service marketplace.
