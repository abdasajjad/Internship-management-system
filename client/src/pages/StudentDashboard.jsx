import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const [internships, setInternships] = useState([]);
    const [myApplications, setMyApplications] = useState([]);
    const [search, setSearch] = useState('');
    const [resumeFile, setResumeFile] = useState(null);
    const [certFile, setCertFile] = useState(null);

    useEffect(() => {
        fetchInternships();
        fetchMyApplications();
    }, []);

    const fetchInternships = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/internships?company=${search}`);
            setInternships(res.data);
        } catch (err) {
            console.error("Error fetching internships", err);
        }
    };

    const fetchMyApplications = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/applications/my');
            setMyApplications(res.data);
        } catch (err) {
            console.error("Error fetching applications", err);
        }
    };

    const handleApply = async (internshipId) => {
        const formData = new FormData();
        if (resumeFile) formData.append('resume', resumeFile);

        try {
            await axios.post(`http://localhost:5000/api/applications/${internshipId}/apply`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Applied successfully!");
            fetchMyApplications();
        } catch (err) {
            alert(err.response?.data?.message || 'Error applying');
        }
    };

    const handleUploadCert = async (appId) => {
        const formData = new FormData();
        if (certFile) formData.append('certificate', certFile);

        try {
            await axios.post(`http://localhost:5000/api/applications/${appId}/certificate`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            alert("Certificate uploaded!");
            fetchMyApplications();
        } catch (err) {
            alert(err.response?.data?.message || 'Error uploading certificate');
        }
    };

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Welcome, {user && user.name}</h1>
                <Button onClick={logout} variant="destructive">Logout</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Available Internships */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">Available Internships</h2>
                    <div className="mb-4">
                        <Input
                            placeholder="Search by company..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); fetchInternships(); }} // Basic debouncing omitted for brevity
                        />
                    </div>
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                        {internships.map(internship => (
                            <Card key={internship._id}>
                                <CardHeader>
                                    <CardTitle>{internship.title}</CardTitle>
                                    <CardDescription>{internship.company} - {internship.location}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="mb-2">{internship.description}</p>
                                    <p className="text-sm text-gray-500 mb-4">Duration: {internship.duration}</p>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button>Apply Now</Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Apply for {internship.title}</DialogTitle>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <Label htmlFor="resume">Upload Resume (PDF)</Label>
                                                <Input id="resume" type="file" onChange={(e) => setResumeFile(e.target.files[0])} />
                                                <Button onClick={() => handleApply(internship._id)}>Confirm Application</Button>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                {/* My Applications */}
                <div>
                    <h2 className="text-2xl font-semibold mb-4">My Applications</h2>
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Internship</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {myApplications.map(app => (
                                        <TableRow key={app._id}>
                                            <TableCell>{app.internship.title}</TableCell>
                                            <TableCell>{app.internship.company}</TableCell>
                                            <TableCell>
                                                <span className={`px-2 py-1 rounded text-sm ${app.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        app.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                    {app.status}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                {app.status === 'approved' && (
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button size="sm" variant="outline">
                                                                {app.certificateStatus === 'not_uploaded' ? 'Upload Cert' : app.certificateStatus}
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Upload Certificate</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="space-y-4">
                                                                <Label htmlFor="cert">Certificate File</Label>
                                                                <Input id="cert" type="file" onChange={(e) => setCertFile(e.target.files[0])} />
                                                                <Button onClick={() => handleUploadCert(app._id)}>Upload</Button>
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
