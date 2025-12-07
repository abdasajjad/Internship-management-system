import React, { useState, useEffect } from 'react';
import axios from 'axios';
import API_URL from '../config';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const AdminDashboard = () => {
    const { logout } = useAuth();
    const [users, setUsers] = useState([]);

    useEffect(() => {
        // Fetch users (Need a new endpoint for admin to get all users)
        // For now, let's assume we implement it or just use placeholder
        // I didn't implement get all users in auth controller.
        // I will implement client side assuming the endpoint exists or add it.
        // Let's implement fetch assuming the endpoint will be added to backend.
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            // We need an endpoint for this. 
            // I'll create it in backend, but for now client code:
            // const res = await axios.get(`${API_URL}/api/auth/users`);
            // setUsers(res.data);
            console.log("Fetching users...");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Admin Dashboard</h1>
                <Button onClick={logout} variant="destructive">Logout</Button>
            </div>

            <div className="border rounded-md p-4">
                <h2 className="text-xl font-semibold mb-4">Manage Users</h2>
                <p className="text-gray-500 mb-4">User management functionality to be implemented (Requires backend endpoint).</p>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* Map users here */}
                        <TableRow>
                            <TableCell colSpan={4} className="text-center">No users loaded</TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
};

export default AdminDashboard;
