'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@/app/providers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  User,
  Lock,
  BarChart3,
  Save,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  MapPin,
  Briefcase,
  Heart,
  Target,
  Languages,
  Calendar,
  Shield,
  AlertCircle
} from 'lucide-react';

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  age?: number;
  native_language?: string;
  learning_goals?: string;
  interests?: string;
  occupation?: string;
  location?: string;
  level_cefr?: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'progress'>('profile');
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    name: '',
    age: '',
    native_language: '',
    learning_goals: '',
    interests: '',
    occupation: '',
    location: ''
  });
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [resetForm, setResetForm] = useState({
    confirmationText: ''
  });

  const [messages, setMessages] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setProfileForm({
          name: data.user.name || '',
          age: data.user.age?.toString() || '',
          native_language: data.user.native_language || '',
          learning_goals: data.user.learning_goals || '',
          interests: data.user.interests || '',
          occupation: data.user.occupation || '',
          location: data.user.location || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async () => {
    setSaving(true);
    setMessages(null);
    
    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profileForm,
          age: profileForm.age ? parseInt(profileForm.age) : null
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setProfile(prev => ({ ...prev!, ...data.profile }));
        setMessages({ type: 'success', text: 'Profile updated successfully!' });
      } else {
        setMessages({ type: 'error', text: data.error || 'Failed to update profile' });
      }
    } catch (error) {
      setMessages({ type: 'error', text: 'Error updating profile' });
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessages({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    setSaving(true);
    setMessages(null);
    
    try {
      const response = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setMessages({ type: 'success', text: 'Password updated successfully!' });
      } else {
        setMessages({ type: 'error', text: data.error || 'Failed to update password' });
      }
    } catch (error) {
      setMessages({ type: 'error', text: 'Error updating password' });
    } finally {
      setSaving(false);
    }
  };

  const resetProgress = async () => {
    setSaving(true);
    setMessages(null);
    
    try {
      const response = await fetch('/api/reset-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          confirmationText: resetForm.confirmationText
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        setResetForm({ confirmationText: '' });
        setMessages({ type: 'success', text: 'Progress reset successfully! Your learning journey starts fresh.' });
        // Refresh profile to show updated level
        fetchProfile();
      } else {
        setMessages({ type: 'error', text: data.error || 'Failed to reset progress' });
      }
    } catch (error) {
      setMessages({ type: 'error', text: 'Error resetting progress' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto container-padding py-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
                <div className="text-muted-foreground">
                  Cargando configuración...
                  <span className="text-xs block">Loading settings</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto container-padding py-8 space-y-6">
        {/* Header */}
        <Card className="bg-primary/5 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Settings className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl text-primary">
                  Configuración
                  <div className="text-lg font-normal text-muted-foreground">Settings</div>
                </CardTitle>
              </div>
            </div>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Gestiona tu perfil, seguridad y progreso de aprendizaje
              <span className="text-xs block">Manage your profile, security, and learning progress</span>
            </p>
          </CardHeader>
        </Card>

        {/* Messages */}
        {messages && (
          <Card className={`${
            messages.type === 'success' 
              ? 'bg-success/5 border-success/20 text-success' 
              : 'bg-destructive/5 border-destructive/20 text-destructive'
          }`}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                {messages.type === 'success' ? (
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                )}
                {messages.text}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Card>
          <CardContent className="p-2">
            <div className="flex space-x-1">
              <Button
                onClick={() => setActiveTab('profile')}
                variant={activeTab === 'profile' ? 'default' : 'ghost'}
                className={`flex-1 ${activeTab === 'profile' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Perfil</span>
                <span className="sm:hidden">Perfil</span>
              </Button>
              <Button
                onClick={() => setActiveTab('security')}
                variant={activeTab === 'security' ? 'default' : 'ghost'}
                className={`flex-1 ${activeTab === 'security' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <Lock className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Seguridad</span>
                <span className="sm:hidden">Seguridad</span>
              </Button>
              <Button
                onClick={() => setActiveTab('progress')}
                variant={activeTab === 'progress' ? 'default' : 'ghost'}
                className={`flex-1 ${activeTab === 'progress' ? 'bg-primary text-primary-foreground' : ''}`}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Progreso</span>
                <span className="sm:hidden">Progreso</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                <CardTitle>
                  Información Personal
                  <span className="text-sm font-normal text-muted-foreground ml-2">Personal Information</span>
                </CardTitle>
              </div>
              <p className="text-muted-foreground">
                Esta información ayuda a Profesora Elena a personalizar tu experiencia de aprendizaje.
                <span className="text-xs block">This information helps Profesora Elena personalize your learning experience.</span>
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">
                    Nombre
                    <span className="text-xs text-muted-foreground ml-2">Name</span>
                  </Label>
                  <Input
                    id="name"
                    type="text"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Tu nombre"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="age">
                    <Calendar className="h-4 w-4 inline mr-1" />
                    Edad
                    <span className="text-xs text-muted-foreground ml-2">Age</span>
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    value={profileForm.age}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, age: e.target.value }))}
                    placeholder="Tu edad"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="language">
                    <Languages className="h-4 w-4 inline mr-1" />
                    Idioma Nativo
                    <span className="text-xs text-muted-foreground ml-2">Native Language</span>
                  </Label>
                  <select
                    id="language"
                    value={profileForm.native_language}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, native_language: e.target.value }))}
                    className="input-field w-full"
                  >
                    <option value="">Selecciona tu idioma nativo</option>
                    <option value="English">English</option>
                    <option value="Mandarin">Mandarin</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Italian">Italian</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Russian">Russian</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="occupation">
                    <Briefcase className="h-4 w-4 inline mr-1" />
                    Ocupación
                    <span className="text-xs text-muted-foreground ml-2">Occupation</span>
                  </Label>
                  <Input
                    id="occupation"
                    type="text"
                    value={profileForm.occupation}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, occupation: e.target.value }))}
                    placeholder="Tu ocupación"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Ubicación
                    <span className="text-xs text-muted-foreground ml-2">Location</span>
                  </Label>
                  <Input
                    id="location"
                    type="text"
                    value={profileForm.location}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Ciudad, País"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="interests">
                    <Heart className="h-4 w-4 inline mr-1" />
                    Intereses/Hobbies
                    <span className="text-xs text-muted-foreground ml-2">Interests/Hobbies</span>
                  </Label>
                  <Input
                    id="interests"
                    type="text"
                    value={profileForm.interests}
                    onChange={(e) => setProfileForm(prev => ({ ...prev, interests: e.target.value }))}
                    placeholder="Música, viajes, cocina..."
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="goals">
                  <Target className="h-4 w-4 inline mr-1" />
                  Objetivos de Aprendizaje
                  <span className="text-xs text-muted-foreground ml-2">Learning Goals</span>
                </Label>
                <Textarea
                  id="goals"
                  value={profileForm.learning_goals}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, learning_goals: e.target.value }))}
                  rows={3}
                  placeholder="¿Por qué estás aprendiendo español? ¿Cuáles son tus objetivos?"
                />
              </div>
              
              <div className="flex justify-end">
                <Button
                  onClick={updateProfile}
                  disabled={saving}
                  className="btn-primary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Guardar Perfil
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Security Tab */}
        {activeTab === 'security' && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                <CardTitle>
                  Cambiar Contraseña
                  <span className="text-sm font-normal text-muted-foreground ml-2">Change Password</span>
                </CardTitle>
              </div>
              <p className="text-muted-foreground">
                Actualiza tu contraseña para mantener tu cuenta segura.
                <span className="text-xs block">Update your password to keep your account secure.</span>
              </p>
            </CardHeader>
            <CardContent>
              <div className="max-w-md space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">
                    <Lock className="h-4 w-4 inline mr-1" />
                    Contraseña Actual
                    <span className="text-xs text-muted-foreground ml-2">Current Password</span>
                  </Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-password">
                    <Lock className="h-4 w-4 inline mr-1" />
                    Nueva Contraseña
                    <span className="text-xs text-muted-foreground ml-2">New Password</span>
                  </Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Al menos 6 caracteres"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">
                    <Lock className="h-4 w-4 inline mr-1" />
                    Confirmar Nueva Contraseña
                    <span className="text-xs text-muted-foreground ml-2">Confirm New Password</span>
                  </Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  />
                </div>
                
                <Button
                  onClick={changePassword}
                  disabled={saving || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="w-full btn-primary"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Shield className="h-4 w-4 mr-2" />
                      Actualizar Contraseña
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress Tab */}
        {activeTab === 'progress' && (
          <div className="space-y-6">
            {/* Current Progress */}
            <Card className="bg-primary/5 border-primary/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle>
                    Progreso Actual
                    <span className="text-sm font-normal text-muted-foreground ml-2">Current Progress</span>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Badge variant="outline" className="text-lg px-3 py-1 border-primary/20 text-primary">
                      {profile?.level_cefr || 'A1'}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-lg font-medium text-foreground">
                      Nivel CEFR: {profile?.level_cefr || 'A1'}
                      <span className="text-sm text-muted-foreground block">CEFR Level: {profile?.level_cefr || 'A1'}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Tu nivel actual de competencia en español
                      <span className="text-xs block">Your current Spanish proficiency level</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reset Progress */}
            <Card className="bg-destructive/5 border-destructive/20">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <CardTitle className="text-destructive">
                    Reiniciar Progreso de Aprendizaje
                    <span className="text-sm font-normal text-muted-foreground ml-2">Reset Learning Progress</span>
                  </CardTitle>
                </div>
                <p className="text-destructive">
                  Esto eliminará permanentemente todo tu progreso de aprendizaje, incluyendo:
                  <span className="text-xs block text-muted-foreground">This will permanently delete all your learning progress, including:</span>
                </p>
              </CardHeader>
              <CardContent>
                <ul className="text-destructive mb-6 space-y-2">
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Todas las lecciones completadas e historial de sesiones
                      <span className="text-xs block text-muted-foreground">All completed lessons and session history</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Progreso de vocabulario y repasos SRS
                      <span className="text-xs block text-muted-foreground">Vocabulary progress and SRS reviews</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Tareas enviadas y calificaciones
                      <span className="text-xs block text-muted-foreground">Homework submissions and grades</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Registros de errores y progreso de habilidades
                      <span className="text-xs block text-muted-foreground">Error logs and skill progress</span>
                    </div>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <div>
                      Tu nivel CEFR se reiniciará a A1
                      <span className="text-xs block text-muted-foreground">Your CEFR level will reset to A1</span>
                    </div>
                  </li>
                </ul>
                
                <div className="max-w-md space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-confirmation" className="text-destructive">
                      Escribe &quot;RESET MY PROGRESS&quot; para confirmar
                      <span className="text-xs text-muted-foreground block">Type &quot;RESET MY PROGRESS&quot; to confirm</span>
                    </Label>
                    <Input
                      id="reset-confirmation"
                      type="text"
                      value={resetForm.confirmationText}
                      onChange={(e) => setResetForm(prev => ({ ...prev, confirmationText: e.target.value }))}
                      placeholder="RESET MY PROGRESS"
                      className="border-destructive/20 focus:border-destructive focus:ring-destructive"
                    />
                  </div>
                  
                  <Button
                    onClick={resetProgress}
                    disabled={saving || resetForm.confirmationText !== 'RESET MY PROGRESS'}
                    className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Reiniciando...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Reiniciar Todo el Progreso
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}