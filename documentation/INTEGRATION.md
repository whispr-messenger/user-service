# Guide d'Intégration Frontend - User Service

Ce guide détaille comment intégrer le User Service dans votre application frontend (React, Vue, Angular, etc.).

##  Configuration Initiale

### 1. Configuration de Base

```javascript
// config/api.js
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default apiClient;
```

### 2. Variables d'Environnement

```env
# .env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
```

##  Gestion des Utilisateurs

### Service Utilisateur

```javascript
// services/userService.js
import apiClient from '../config/api';

export const userService = {
  // Récupérer le profil utilisateur
  async getProfile(userId) {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  // Mettre à jour le profil
  async updateProfile(userId, userData) {
    const response = await apiClient.put(`/users/${userId}`, userData);
    return response.data;
  },

  // Créer un utilisateur
  async createUser(userData) {
    const response = await apiClient.post('/users', userData);
    return response.data;
  },

  // Upload photo de profil
  async uploadProfilePicture(userId, file) {
    const formData = new FormData();
    formData.append('profilePicture', file);

    const response = await apiClient.post(
      `/users/${userId}/profile-picture`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Supprimer un utilisateur
  async deleteUser(userId) {
    await apiClient.delete(`/users/${userId}`);
  },
};
```

### Composant React - Profil Utilisateur

```jsx
// components/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadUserProfile();
  }, [userId]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = await userService.getProfile(userId);
      setUser(userData);
      setFormData(userData);
    } catch (error) {
      console.error('Erreur lors du chargement du profil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const updatedUser = await userService.updateProfile(userId, formData);
      setUser(updatedUser);
      setEditing(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        const result = await userService.uploadProfilePicture(userId, file);
        setUser({ ...user, profilePictureUrl: result.profilePictureUrl });
      } catch (error) {
        console.error('Erreur lors de l\'upload:', error);
      }
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (!user) return <div>Utilisateur non trouvé</div>;

  return (
    <div className="user-profile">
      <div className="profile-header">
        <img
          src={user.profilePictureUrl || '/default-avatar.png'}
          alt="Photo de profil"
          className="profile-picture"
        />
        <input
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          style={{ display: 'none' }}
          id="profile-upload"
        />
        <label htmlFor="profile-upload" className="upload-btn">
          Changer la photo
        </label>
      </div>

      {editing ? (
        <div className="edit-form">
          <input
            type="text"
            value={formData.firstName || ''}
            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
            placeholder="Prénom"
          />
          <input
            type="text"
            value={formData.lastName || ''}
            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
            placeholder="Nom"
          />
          <textarea
            value={formData.biography || ''}
            onChange={(e) => setFormData({...formData, biography: e.target.value})}
            placeholder="Biographie"
          />
          <button onClick={handleSave}>Sauvegarder</button>
          <button onClick={() => setEditing(false)}>Annuler</button>
        </div>
      ) : (
        <div className="profile-info">
          <h2>{user.firstName} {user.lastName}</h2>
          <p>@{user.username}</p>
          <p>{user.biography}</p>
          <button onClick={() => setEditing(true)}>Modifier</button>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
```

##  Gestion des Contacts

### Service Contacts

```javascript
// services/contactService.js
import apiClient from '../config/api';

export const contactService = {
  // Récupérer la liste des contacts
  async getContacts(userId) {
    const response = await apiClient.get(`/contacts?userId=${userId}`);
    return response.data;
  },

  // Ajouter un contact
  async addContact(contactData) {
    const response = await apiClient.post('/contacts', contactData);
    return response.data;
  },

  // Supprimer un contact
  async removeContact(contactId) {
    await apiClient.delete(`/contacts/${contactId}`);
  },

  // Synchroniser les contacts du téléphone
  async syncPhoneContacts(phoneContacts) {
    const response = await apiClient.post('/contacts/sync', {
      contacts: phoneContacts
    });
    return response.data;
  },
};
```

### Composant React - Liste de Contacts

```jsx
// components/ContactList.jsx
import React, { useState, useEffect } from 'react';
import { contactService } from '../services/contactService';

const ContactList = ({ userId }) => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadContacts();
  }, [userId]);

  const loadContacts = async () => {
    try {
      setLoading(true);
      const contactsData = await contactService.getContacts(userId);
      setContacts(contactsData);
    } catch (error) {
      console.error('Erreur lors du chargement des contacts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveContact = async (contactId) => {
    try {
      await contactService.removeContact(contactId);
      setContacts(contacts.filter(c => c.id !== contactId));
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  if (loading) return <div>Chargement des contacts...</div>;

  return (
    <div className="contact-list">
      <h3>Mes Contacts ({contacts.length})</h3>
      {contacts.map(contact => (
        <div key={contact.id} className="contact-item">
          <img
            src={contact.profilePictureUrl || '/default-avatar.png'}
            alt={contact.displayName}
            className="contact-avatar"
          />
          <div className="contact-info">
            <h4>{contact.displayName}</h4>
            <p>{contact.phoneNumber}</p>
          </div>
          <button
            onClick={() => handleRemoveContact(contact.id)}
            className="remove-btn"
          >
            Supprimer
          </button>
        </div>
      ))}
    </div>
  );
};

export default ContactList;
```

##  Recherche d'Utilisateurs

### Service de Recherche

```javascript
// services/searchService.js
import apiClient from '../config/api';

export const searchService = {
  // Recherche générale
  async searchUsers(query, filters = {}) {
    const params = new URLSearchParams({
      q: query,
      ...filters
    });
    const response = await apiClient.get(`/search/users?${params}`);
    return response.data;
  },

  // Recherche par téléphone
  async searchByPhone(phoneNumber) {
    const response = await apiClient.get(`/search/phone/${encodeURIComponent(phoneNumber)}`);
    return response.data;
  },

  // Recherche par nom d'utilisateur
  async searchByUsername(username) {
    const response = await apiClient.get(`/search/username/${username}`);
    return response.data;
  },
};
```

### Hook React - Recherche avec Debounce

```jsx
// hooks/useSearch.js
import { useState, useEffect, useCallback } from 'react';
import { searchService } from '../services/searchService';

export const useSearch = (initialQuery = '', delay = 300) => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const debouncedSearch = useCallback(
    debounce(async (searchQuery) => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const searchResults = await searchService.searchUsers(searchQuery);
        setResults(searchResults);
      } catch (err) {
        setError(err.message);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, delay),
    [delay]
  );

  useEffect(() => {
    debouncedSearch(query);
  }, [query, debouncedSearch]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
  };
};

// Fonction utilitaire debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

### Composant React - Barre de Recherche

```jsx
// components/UserSearch.jsx
import React from 'react';
import { useSearch } from '../hooks/useSearch';

const UserSearch = ({ onUserSelect }) => {
  const { query, setQuery, results, loading, error } = useSearch();

  return (
    <div className="user-search">
      <div className="search-input-container">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher par nom, téléphone ou @username"
          className="search-input"
        />
        {loading && <div className="search-spinner">loading</div>}
      </div>

      {error && (
        <div className="search-error">
          Erreur de recherche: {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="search-results">
          {results.map(user => (
            <div
              key={user.id}
              className="search-result-item"
              onClick={() => onUserSelect(user)}
            >
              <img
                src={user.profilePictureUrl || '/default-avatar.png'}
                alt={user.firstName}
                className="result-avatar"
              />
              <div className="result-info">
                <h4>{user.firstName} {user.lastName}</h4>
                <p>@{user.username}</p>
                {user.phoneNumber && <p>{user.phoneNumber}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {query && !loading && results.length === 0 && (
        <div className="no-results">
          Aucun utilisateur trouvé pour "{query}"
        </div>
      )}
    </div>
  );
};

export default UserSearch;
```

## 👥 Gestion des Groupes

### Service Groupes

```javascript
// services/groupService.js
import apiClient from '../config/api';

export const groupService = {
  // Récupérer les groupes de l'utilisateur
  async getUserGroups(userId) {
    const response = await apiClient.get(`/groups?userId=${userId}`);
    return response.data;
  },

  // Créer un groupe
  async createGroup(groupData) {
    const response = await apiClient.post('/groups', groupData);
    return response.data;
  },

  // Mettre à jour un groupe
  async updateGroup(groupId, groupData) {
    const response = await apiClient.put(`/groups/${groupId}`, groupData);
    return response.data;
  },

  // Ajouter un membre
  async addMember(groupId, memberData) {
    const response = await apiClient.post(`/groups/${groupId}/members`, memberData);
    return response.data;
  },

  // Supprimer un membre
  async removeMember(groupId, userId) {
    await apiClient.delete(`/groups/${groupId}/members/${userId}`);
  },

  // Quitter un groupe
  async leaveGroup(groupId, userId) {
    await apiClient.post(`/groups/${groupId}/leave`, { userId });
  },
};
```

## 🔒 Gestion de la Confidentialité

### Service Confidentialité

```javascript
// services/privacyService.js
import apiClient from '../config/api';

export const privacyService = {
  // Récupérer les paramètres de confidentialité
  async getPrivacySettings(userId) {
    const response = await apiClient.get(`/privacy/${userId}`);
    return response.data;
  },

  // Mettre à jour les paramètres
  async updatePrivacySettings(userId, settings) {
    const response = await apiClient.put(`/privacy/${userId}`, settings);
    return response.data;
  },

  // Bloquer un utilisateur
  async blockUser(userId, blockedUserId) {
    const response = await apiClient.post('/blocked-users', {
      userId,
      blockedUserId
    });
    return response.data;
  },

  // Débloquer un utilisateur
  async unblockUser(userId, blockedUserId) {
    await apiClient.delete(`/blocked-users/${userId}/${blockedUserId}`);
  },
};
```

##  Intégration Mobile (React Native)

### Configuration Spécifique Mobile

```javascript
// config/mobileApi.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = Platform.select({
  ios: 'http://localhost:3000',
  android: 'http://10.0.2.2:3000', // Émulateur Android
});

const mobileApiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

// Intercepteur avec AsyncStorage
mobileApiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default mobileApiClient;
```

### Synchronisation des Contacts Téléphone

```javascript
// services/phoneContactsService.js
import Contacts from 'react-native-contacts';
import { PermissionsAndroid, Platform } from 'react-native';
import { contactService } from './contactService';

export const phoneContactsService = {
  async requestContactsPermission() {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.READ_CONTACTS
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true; // iOS gère les permissions automatiquement
  },

  async getPhoneContacts() {
    const hasPermission = await this.requestContactsPermission();
    if (!hasPermission) {
      throw new Error('Permission refusée pour accéder aux contacts');
    }

    return new Promise((resolve, reject) => {
      Contacts.getAll((err, contacts) => {
        if (err) {
          reject(err);
        } else {
          const formattedContacts = contacts
            .filter(contact => contact.phoneNumbers.length > 0)
            .map(contact => ({
              displayName: contact.displayName,
              phoneNumbers: contact.phoneNumbers.map(p => p.number),
              emailAddresses: contact.emailAddresses.map(e => e.email),
            }));
          resolve(formattedContacts);
        }
      });
    });
  },

  async syncWithServer(userId) {
    try {
      const phoneContacts = await this.getPhoneContacts();
      const syncResult = await contactService.syncPhoneContacts(phoneContacts);
      return syncResult;
    } catch (error) {
      console.error('Erreur lors de la synchronisation:', error);
      throw error;
    }
  },
};
```

## 🔄 Gestion des États (Redux/Zustand)

### Store Zustand

```javascript
// store/userStore.js
import { create } from 'zustand';
import { userService } from '../services/userService';

export const useUserStore = create((set, get) => ({
  // État
  currentUser: null,
  contacts: [],
  groups: [],
  loading: false,
  error: null,

  // Actions
  setCurrentUser: (user) => set({ currentUser: user }),

  loadUserProfile: async (userId) => {
    set({ loading: true, error: null });
    try {
      const user = await userService.getProfile(userId);
      set({ currentUser: user, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  updateProfile: async (userId, userData) => {
    set({ loading: true });
    try {
      const updatedUser = await userService.updateProfile(userId, userData);
      set({ currentUser: updatedUser, loading: false });
    } catch (error) {
      set({ error: error.message, loading: false });
    }
  },

  loadContacts: async (userId) => {
    try {
      const contacts = await contactService.getContacts(userId);
      set({ contacts });
    } catch (error) {
      set({ error: error.message });
    }
  },

  addContact: async (contactData) => {
    try {
      const newContact = await contactService.addContact(contactData);
      set((state) => ({
        contacts: [...state.contacts, newContact]
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },

  removeContact: async (contactId) => {
    try {
      await contactService.removeContact(contactId);
      set((state) => ({
        contacts: state.contacts.filter(c => c.id !== contactId)
      }));
    } catch (error) {
      set({ error: error.message });
    }
  },
}));
```

##  Gestion des Erreurs

### Intercepteur d'Erreurs Global

```javascript
// utils/errorHandler.js
import { toast } from 'react-toastify';

export const handleApiError = (error) => {
  if (error.response) {
    // Erreur de réponse du serveur
    const { status, data } = error.response;

    switch (status) {
      case 400:
        toast.error(data.message || 'Données invalides');
        break;
      case 401:
        toast.error('Session expirée, veuillez vous reconnecter');
        // Rediriger vers la page de connexion
        window.location.href = '/login';
        break;
      case 403:
        toast.error('Accès refusé');
        break;
      case 404:
        toast.error('Ressource non trouvée');
        break;
      case 500:
        toast.error('Erreur serveur, veuillez réessayer plus tard');
        break;
      default:
        toast.error(data.message || 'Une erreur est survenue');
    }
  } else if (error.request) {
    // Erreur de réseau
    toast.error('Problème de connexion, vérifiez votre réseau');
  } else {
    // Autre erreur
    toast.error('Une erreur inattendue est survenue');
  }

  console.error('API Error:', error);
};

// Ajouter l'intercepteur global
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    handleApiError(error);
    return Promise.reject(error);
  }
);
```

##  Monitoring et Analytics

### Tracking des Événements

```javascript
// utils/analytics.js
export const trackEvent = (eventName, properties = {}) => {
  // Intégration avec votre service d'analytics (Google Analytics, Mixpanel, etc.)
  if (window.gtag) {
    window.gtag('event', eventName, properties);
  }

  // Log pour le développement
  console.log('Event tracked:', eventName, properties);
};

// Exemples d'utilisation
export const trackUserEvents = {
  profileUpdated: (userId) => trackEvent('profile_updated', { userId }),
  contactAdded: (userId, contactId) => trackEvent('contact_added', { userId, contactId }),
  groupCreated: (userId, groupId) => trackEvent('group_created', { userId, groupId }),
  userSearched: (query, resultsCount) => trackEvent('user_searched', { query, resultsCount }),
};
```

##  Outils de Développement

### Mock Service pour les Tests

```javascript
// __mocks__/userService.js
export const userService = {
  getProfile: jest.fn().mockResolvedValue({
    id: '1',
    firstName: 'John',
    lastName: 'Doe',
    username: 'johndoe',
    phoneNumber: '+1234567890',
    profilePictureUrl: null,
    biography: 'Test user',
  }),

  updateProfile: jest.fn().mockResolvedValue({
    id: '1',
    firstName: 'John Updated',
    lastName: 'Doe',
  }),

  createUser: jest.fn().mockResolvedValue({ id: '2' }),
  deleteUser: jest.fn().mockResolvedValue(undefined),
};
```

### Tests d'Intégration

```javascript
// __tests__/UserProfile.test.jsx
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import UserProfile from '../components/UserProfile';
import { userService } from '../services/userService';

jest.mock('../services/userService');

describe('UserProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('affiche le profil utilisateur', async () => {
    render(<UserProfile userId="1" />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('@johndoe')).toBeInTheDocument();
    });
  });

  test('permet de modifier le profil', async () => {
    render(<UserProfile userId="1" />);

    await waitFor(() => {
      fireEvent.click(screen.getByText('Modifier'));
    });

    const firstNameInput = screen.getByDisplayValue('John');
    fireEvent.change(firstNameInput, { target: { value: 'John Updated' } });

    fireEvent.click(screen.getByText('Sauvegarder'));

    await waitFor(() => {
      expect(userService.updateProfile).toHaveBeenCalledWith('1', expect.objectContaining({
        firstName: 'John Updated'
      }));
    });
  });
});
```

##  Ressources Supplémentaires

### Documentation API
- Swagger UI: `http://localhost:3000/api/docs`
- Postman Collection: Disponible dans `/docs/postman/`

### Exemples Complets
- Application React complète: `/examples/react-app/`
- Application React Native: `/examples/react-native-app/`
- Application Vue.js: `/examples/vue-app/`

### Support
- Issues GitHub: [Lien vers le repository]
- Documentation technique: `/documentation/`
- Guide de contribution: `CONTRIBUTING.md`

---

**Note**: Ce guide couvre les intégrations les plus courantes. Pour des besoins spécifiques ou des questions, n'hésitez pas à consulter la documentation complète ou à ouvrir une issue sur GitHub.
