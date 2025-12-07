import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const FacultyDashboard = () => {
    const { user, logout } = useAuth();
    const [internships, setInternships] = useState([]);
    const [applications, setApplications] = useState([]);
    const [newInternship, setNewInternship] = useState({
        title: '', company: '', description: '', location: '', duration: '', department: ''
    });

    useEffect(() => {
        fetchMyInternships();
    }, []);

    const fetchMyInternships = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/internships');
            // Filter by postedBy if user.id matches. 
            const myInts = res.data.filter(i => i.postedBy._id === user._id);
            setInternships(myInts);
        } catch (err) {
            console.error(err);
        }
    };

    const handlePostInternship = async (e) => {
        e.preventDefault();
        try {
            await axios.post('http://localhost:5000/api/internships', newInternship);
            alert("Internship Posted!");
            setNewInternship({ title: '', company: '', description: '', location: '', duration: '', department: '' });
            fetchMyInternships();
        } catch (err) {
            alert("Error posting internship");
        }
    };

    const viewApplications = async (internshipId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/applications/internship/${internshipId}`);
            setApplications(res.data);
        } catch (err) {
            alert("Error loading applications");
        }
    };

    const updateStatus = async (appId, status) => {
        try {
            await axios.put(`http://localhost:5000/api/applications/${appId}/status`, { status });
            // Refresh applications list locally
            setApplications(applications.map(app => app._id === appId ? { ...app, status } : app));
        } catch (err) {
            console.error(err);
        }
    };

    const verifyCert = async (appId, status) => {
        try {
            await axios.put(`http://localhost:5000/api/applications/${appId}/certificate-verify`, { status });
            setApplications(applications.map(app => app._id === appId ? { ...app, certificateStatus: status } : app));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Faculty Dashboard</h1>
                <Button onClick={logout} variant="destructive">Logout</Button>
            </div>

            <Tabs defaultValue="post">
                <TabsList>
                    <TabsTrigger value="post">Post Internship</TabsTrigger>
                    <TabsTrigger value="manage">Manage Internships</TabsTrigger>
                </TabsList>

                <TabsContent value="post">
                    <Card className="max-w-2xl">
                        <CardHeader><CardTitle>Create New Internship</CardTitle></CardHeader>
                        <CardContent>
                            <form onSubmit={handlePostInternship} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Title</Label><Input value={newInternship.title} onChange={e => setNewInternship({ ...newInternship, title: e.target.value })} required /></div>
                                    <div className="space-y-2"><Label>Company</Label><Input value={newInternship.company} onChange={e => setNewInternship({ ...newInternship, company: e.target.value })} required /></div>
                                </div>
                                <div className="space-y-2"><Label>Description</Label><Input value={newInternship.description} onChange={e => setNewInternship({ ...newInternship, description: e.target.value })} required /></div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2"><Label>Location</Label><Input value={newInternship.location} onChange={e => setNewInternship({ ...newInternship, location: e.target.value })} /></div>
                                    <div className="space-y-2"><Label>Duration</Label><Input value={newInternship.duration} onChange={e => setNewInternship({ ...newInternship, duration: e.target.value })} /></div>
                                </div>
                                <div className="space-y-2"><Label>Department</Label><Input value={newInternship.department} onChange={e => setNewInternship({ ...newInternship, department: e.target.value })} /></div>
                                <Button type="submit">Post Position</Button>
                            </form>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="manage">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="col-span-1 border-r pr-4">
                            <h3 className="font-semibold mb-2">My Postings</h3>
                            <div className="space-y-2">
                                {internships.map(i => (
                                    <div key={i._id} className="p-3 border rounded cursor-pointer hover:bg-gray-50" onClick={() => viewApplications(i._id)}>
                                        <div className="font-medium">{i.title}</div>
                                        <div className="text-sm text-gray-500">{i.company}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <h3 className="font-semibold mb-2">Applications</h3>
                            {applications.length === 0 ? <p className="text-gray-500">Select an internship to view applications</p> :
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Student</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Certificate</TableHead>
                                            <TableHead>Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {applications.map(app => (
                                            <TableRow key={app._id}>
                                                <TableCell>
                                                    <div>{app.student.name}</div>
                                                    <div className="text-xs text-gray-500">{app.student.email}</div>
                                                    {app.resumeSnapshot && <a href={`http://localhost:5000/${app.resumeSnapshot}`} target="_blank" className="text-blue-500 text-xs underline">View Resume</a>}
                                                </TableCell>
                                                <TableCell>{app.status}</TableCell>
                                                <TableCell>
                                                    {app.certificate ? (
                                                        <div className="flex flex-col">
                                                            <a href={`http://localhost:5000/${app.certificate}`} target="_blank" className="text-blue-500 underline text-xs">View API</a>
                                                            <span className="text-xs">{app.certificateStatus}</span>
                                                            <div className="flex gap-1 mt-1">
                                                                {app.certificateStatus !== 'verified' && (
                                                                    <Button size="icon" className="h-6 w-6" onClick={() => verifyCert(app._id, 'verified')}>✓</Button>
                                                                )}
                                                                {app.certificateStatus !== 'rejected' && (
                                                                    <Button size="icon" variant="destructive" className="h-6 w-6" onClick={() => verifyCert(app._id, 'rejected')}>✗</Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ) : 'Not uploaded'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        {app.status !== 'approved' && (
                                                            <Button size="sm" onClick={() => updateStatus(app._id, 'approved')}>Approve</Button>
                                                        )}
                                                        {app.status !== 'rejected' && (
                                                            <Button size="sm" variant="outline" onClick={() => updateStatus(app._id, 'rejected')}>Reject</Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            }
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default FacultyDashboard;
