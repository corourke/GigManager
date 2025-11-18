# GigManager

A comprehensive web application for production and event management companies to manage events, equipment, and staff. Built for production companies, sound/lighting companies, event producers, venues, and equipment rental companies.

## Features

- **Event Management**: Create, track, and manage gigs/events with detailed information
- **Equipment Tracking**: Manage equipment inventory, availability, and assignments
- **Staff Management**: Assign staff roles and track availability
- **Organization Management**: Multi-organization support with role-based access
- **Real-time Updates**: Live data synchronization across users
- **Google OAuth**: Secure authentication with Google accounts
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## Tech Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Real-time, Storage)
- **Build Tool**: Vite
- **Testing**: Vitest
- **Deployment**: Static hosting (Vercel, Netlify, etc.)

## Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account and project
- Google Cloud Console account (for Google Places API - optional)

## Quick Start

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd gigmanager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Supabase**
   - Create a new Supabase project
   - Run the database migrations in `supabase/migrations/`
   - Configure Google OAuth in Supabase Auth settings
   - Copy `.env.example` to `.env.local` and add your Supabase credentials

4. **Configure environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key  # Optional
   ```

5. **Run database setup**
   ```bash
   # Apply migrations (if not done automatically)
   # Set up RLS policies
   ```

6. **Start development server**
   ```bash
   npm run dev
   ```

## Project Structure

```
├── src/
│   ├── components/          # React components
│   │   ├── ui/             # Shadcn/ui components
│   │   └── ...             # Feature components
│   ├── utils/              # Utility functions and API clients
│   │   └── supabase/       # Supabase client utilities
│   └── styles/             # Global styles and Tailwind config
├── supabase/               # Supabase backend code
│   ├── migrations/         # Database migrations
│   └── functions/          # Edge functions
├── docs/                   # Documentation
└── public/                 # Static assets
```

## User Roles

- **Admin**: Full access to organization data and settings
- **Manager**: Create and manage gigs, equipment, and staff
- **Staff**: Access to assigned gigs and tasks
- **Viewer**: Read-only access to organization data

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests

### Testing

```bash
npm test
```

### Database Management

Database schema and migrations are managed through Supabase. See `docs/setup/` for detailed setup instructions.

## Deployment

This is a static React SPA that can be deployed to any static hosting service:

- **Vercel**: Connect your GitHub repo for automatic deployments
- **Netlify**: Drag & drop the `dist` folder or connect via Git
- **GitHub Pages**: Use GitHub Actions for automated deployment

## Documentation

- [Requirements](./docs/requirements.md) - Detailed feature specifications
- [Tech Stack](./docs/tech-stack.md) - Technology choices and architecture
- [Setup Guide](./docs/setup/) - Detailed setup and configuration

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or support, please open an issue in the GitHub repository. 
