import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, UserPlus, Shield, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface UserProfile {
  id: string;
  full_name: string;
  phone: string | null;
  email?: string;
  role?: 'admin' | 'client';
}

export default function UsersManagement() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    phone: '',
    role: 'client' as 'admin' | 'client',
  });
  const navigate = useNavigate();
  const { userRole, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading && userRole !== 'admin') {
      navigate('/auth');
    }
  }, [userRole, authLoading, navigate]);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name');

      if (profilesError) throw profilesError;

      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        (profiles || []).map(async (profile) => {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.id)
            .single();

          return {
            ...profile,
            role: roleData?.role || 'client',
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.full_name) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-super-admin', {
        body: {
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          phone: newUser.phone,
          role: newUser.role,
        },
      });

      if (error) throw error;

      toast.success('Utilisateur créé avec succès');
      setShowCreateForm(false);
      setNewUser({
        email: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'client',
      });
      fetchUsers();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Erreur lors de la création de l\'utilisateur');
    } finally {
      setCreating(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: 'admin' | 'client') => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success('Rôle mis à jour avec succès');
      fetchUsers();
    } catch (error: any) {
      console.error('Error updating role:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gestion des Utilisateurs</h1>
          <p className="text-muted-foreground">
            Gérez les utilisateurs et leurs accès à la plateforme LegalForm
          </p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Créer un Utilisateur</CardTitle>
                <CardDescription>
                  Créez de nouveaux comptes pour l'équipe Legal Form
                </CardDescription>
              </div>
              <Button
                onClick={() => setShowCreateForm(!showCreateForm)}
                variant={showCreateForm ? 'outline' : 'default'}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                {showCreateForm ? 'Annuler' : 'Nouveau Compte'}
              </Button>
            </div>
          </CardHeader>
          {showCreateForm && (
            <CardContent>
              <div className="grid gap-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                      placeholder="email@legalform.ci"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Mot de passe *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      placeholder="Minimum 6 caractères"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="full_name">Nom complet *</Label>
                    <Input
                      id="full_name"
                      value={newUser.full_name}
                      onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                      placeholder="Prénom Nom"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone</Label>
                    <Input
                      id="phone"
                      value={newUser.phone}
                      onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="+225 XX XX XX XX XX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rôle *</Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(value: 'admin' | 'client') =>
                      setNewUser({ ...newUser, role: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">
                        <div className="flex items-center">
                          <UserIcon className="mr-2 h-4 w-4" />
                          Client
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center">
                          <Shield className="mr-2 h-4 w-4" />
                          Administrateur
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createUser} disabled={creating} className="w-full">
                  {creating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Création en cours...
                    </>
                  ) : (
                    'Créer le compte'
                  )}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Utilisateurs ({users.length})</CardTitle>
            <CardDescription>Liste de tous les utilisateurs de la plateforme</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email/Téléphone</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {user.email && <span className="text-sm">{user.email}</span>}
                        {user.phone && (
                          <span className="text-sm text-muted-foreground">{user.phone}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={user.role}
                        onValueChange={(value: 'admin' | 'client') =>
                          updateUserRole(user.id, value)
                        }
                      >
                        <SelectTrigger className="w-[150px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">
                            <div className="flex items-center">
                              <UserIcon className="mr-2 h-4 w-4" />
                              Client
                            </div>
                          </SelectItem>
                          <SelectItem value="admin">
                            <div className="flex items-center">
                              <Shield className="mr-2 h-4 w-4" />
                              Administrateur
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">ID: {user.id.slice(0, 8)}...</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
