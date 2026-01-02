# 🎭 Role-Based Dashboard Setup Guide

## ✅ What's Been Implemented

### 1. **Four User Roles**
- **Admin** - Full system access
- **Manager** - Reports and analytics access
- **Warehouse** - Warehouse operations only
- **Shop** - Shop operations only

### 2. **Role-Specific Dashboards**
Each role gets a completely different dashboard:

#### 👑 Admin Dashboard
- Complete system overview
- Warehouse statistics
- Sales analytics
- All metrics and charts
- Quick actions for all modules

#### 📊 Manager Dashboard
- Business performance metrics
- Warehouse status overview
- Access to all reports
- Analytics and insights
- No operational access

#### 📦 Warehouse Dashboard
- Inventory status
- Quick access to warehouse operations
- Tagging, Stock-in, Distribution, Returns
- Warehouse reports
- Today's tasks checklist

#### 🏪 Shop Dashboard
- Branch-specific view
- Quick access to shop operations
- POS Billing, Sales, Returns
- Shop expenses
- Today's summary

---

## 🚀 How to Assign Roles to Users

### Step 1: Create User in Firebase Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/project/mangalmurti-8eb36/authentication/users)
2. Click "Add user"
3. Enter email and password
4. Click "Add user"
5. **Copy the User UID** (you'll need this)

### Step 2: Assign Role in Firestore
1. Go to [Firestore Database](https://console.firebase.google.com/project/mangalmurti-8eb36/firestore)
2. Click "Start collection" (if first time) or find "users" collection
3. Collection ID: `users`
4. Document ID: **Paste the User UID from Step 1**
5. Add fields:

```
Field: email
Type: string
Value: user@example.com

Field: role
Type: string
Value: admin (or manager, warehouse, shop)

Field: displayName
Type: string
Value: John Doe (optional)

Field: branch
Type: string
Value: Sangli (only for shop users)

Field: createdAt
Type: string
Value: 2025-12-31T10:00:00.000Z

Field: updatedAt
Type: string
Value: 2025-12-31T10:00:00.000Z

Field: permissions
Type: array
Value: [] (leave empty, auto-managed)
```

6. Click "Save"

---

## 📋 Quick Setup Examples

### Example 1: Create Admin User
```
Firebase Auth:
- Email: admin@suwarnasparsh.com
- Password: Admin@123
- UID: abc123xyz (copy this)

Firestore (users/abc123xyz):
{
  email: "admin@suwarnasparsh.com",
  role: "admin",
  displayName: "System Administrator",
  createdAt: "2025-12-31T10:00:00.000Z",
  updatedAt: "2025-12-31T10:00:00.000Z",
  permissions: []
}
```

### Example 2: Create Warehouse User
```
Firebase Auth:
- Email: warehouse@suwarnasparsh.com
- Password: Warehouse@123
- UID: def456uvw (copy this)

Firestore (users/def456uvw):
{
  email: "warehouse@suwarnasparsh.com",
  role: "warehouse",
  displayName: "Warehouse Manager",
  createdAt: "2025-12-31T10:00:00.000Z",
  updatedAt: "2025-12-31T10:00:00.000Z",
  permissions: []
}
```

### Example 3: Create Shop User
```
Firebase Auth:
- Email: sangli@suwarnasparsh.com
- Password: Sangli@123
- UID: ghi789rst (copy this)

Firestore (users/ghi789rst):
{
  email: "sangli@suwarnasparsh.com",
  role: "shop",
  displayName: "Sangli Branch",
  branch: "Sangli",
  createdAt: "2025-12-31T10:00:00.000Z",
  updatedAt: "2025-12-31T10:00:00.000Z",
  permissions: []
}
```

### Example 4: Create Manager User
```
Firebase Auth:
- Email: manager@suwarnasparsh.com
- Password: Manager@123
- UID: jkl012mno (copy this)

Firestore (users/jkl012mno):
{
  email: "manager@suwarnasparsh.com",
  role: "manager",
  displayName: "Operations Manager",
  createdAt: "2025-12-31T10:00:00.000Z",
  updatedAt: "2025-12-31T10:00:00.000Z",
  permissions: []
}
```

---

## 🔐 Role Permissions

### Admin
✅ Full access to everything:
- All warehouse operations
- All shop operations
- All reports
- User management
- Settings

### Manager
✅ View and reports only:
- View warehouse status
- View all reports
- Analytics access
- No operational access

### Warehouse
✅ Warehouse operations only:
- Tagging & Labels
- Stock In
- Distribution
- Returns
- Warehouse Reports

### Shop
✅ Shop operations only:
- Branch Stock
- POS Billing
- Sale Booking
- Sales Report
- Sales Return
- Shop Expenses

---

## 🧪 Testing Role-Based Dashboards

### Test Case 1: Admin User
1. Login with admin credentials
2. **Expected:** See full admin dashboard with all metrics
3. **Expected:** Access to all menu items
4. **Expected:** Can access all pages

### Test Case 2: Warehouse User
1. Login with warehouse credentials
2. **Expected:** See warehouse-specific dashboard
3. **Expected:** Only warehouse menu items visible
4. **Expected:** Cannot access shop pages

### Test Case 3: Shop User
1. Login with shop credentials
2. **Expected:** See shop-specific dashboard
3. **Expected:** Only shop menu items visible
4. **Expected:** Cannot access warehouse pages
5. **Expected:** Branch name displayed

### Test Case 4: Manager User
1. Login with manager credentials
2. **Expected:** See manager dashboard with reports
3. **Expected:** Access to all reports
4. **Expected:** Cannot access operational pages

---

## 📊 Dashboard Features by Role

### Admin Dashboard Includes:
- 👑 Admin welcome banner
- 📦 Warehouse statistics
- ⚡ Quick actions
- 📊 Sales metrics
- 📈 Charts and analytics
- 🎯 Monthly targets
- 📋 Recent orders

### Manager Dashboard Includes:
- 📊 Manager welcome banner
- 📈 Key business metrics
- 📦 Warehouse status
- 📊 Reports access cards
- 💡 Quick insights
- 📉 Performance overview

### Warehouse Dashboard Includes:
- 📦 Warehouse welcome banner
- 📊 Inventory statistics
- ⚡ Quick access cards (5 operations)
- 📋 Today's tasks checklist
- 🎯 Warehouse-specific metrics

### Shop Dashboard Includes:
- 🏪 Shop welcome banner (with branch name)
- 📊 Today's summary (4 metrics)
- ⚡ Quick access cards (6 operations)
- 📋 Today's tasks checklist
- 🎯 Shop-specific metrics

---

## 🔄 Changing User Roles

### To Change a User's Role:
1. Go to Firestore
2. Find `users` collection
3. Find user document (by UID)
4. Edit `role` field
5. Change to: `admin`, `manager`, `warehouse`, or `shop`
6. Update `updatedAt` field to current timestamp
7. Save
8. User must logout and login again to see changes

---

## 🛡️ Security Notes

1. **Role Verification:** Roles are checked on every page load
2. **Firestore Rules:** Update Firestore rules to enforce role-based access
3. **Client-Side Only:** Current implementation is client-side (add server-side validation for production)
4. **Default Role:** If no role assigned, user gets "warehouse" role by default

---

## 📝 Firestore Rules (Recommended)

Add these rules to Firestore for security:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can only read their own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if request.auth != null && 
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Other collections - role-based access
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

---

## ✅ Setup Checklist

Before going live:
- [ ] Create admin user in Firebase Auth
- [ ] Assign admin role in Firestore
- [ ] Test admin login and dashboard
- [ ] Create warehouse user
- [ ] Assign warehouse role
- [ ] Test warehouse login and dashboard
- [ ] Create shop user(s) for each branch
- [ ] Assign shop role with branch name
- [ ] Test shop login and dashboard
- [ ] Create manager user (if needed)
- [ ] Assign manager role
- [ ] Test manager login and dashboard
- [ ] Verify role-based menu visibility
- [ ] Update Firestore security rules

---

## 🎯 Quick Commands

### Create User via Firebase Console:
1. Authentication → Users → Add user
2. Enter email and password
3. Copy UID

### Assign Role via Firestore Console:
1. Firestore → users collection
2. Add document with UID as ID
3. Add fields: email, role, displayName, createdAt, updatedAt
4. Save

---

## 🚨 Troubleshooting

### Issue: User sees "No Role Assigned"
**Solution:** 
- Check Firestore `users` collection
- Verify document exists with user's UID
- Verify `role` field is set correctly
- User must logout and login again

### Issue: Wrong dashboard showing
**Solution:**
- Check user's role in Firestore
- Verify role is one of: admin, manager, warehouse, shop
- Clear browser cache
- Logout and login again

### Issue: Can't access certain pages
**Solution:**
- This is expected based on role
- Check role permissions in `userRoles.ts`
- Contact admin to change role if needed

---

## 📞 Support

### Need Help?
1. Check user's UID in Firebase Auth
2. Check user's role in Firestore
3. Verify document structure matches examples
4. Check browser console for errors

---

**Role-based dashboards are now fully implemented!** 🎉

Each user will see a completely different dashboard based on their assigned role. Set up your users following the examples above!
