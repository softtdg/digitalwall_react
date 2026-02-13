import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import ProjectCard from '../../components/ProjectCard';
import toast from 'react-hot-toast';

const Dashboard = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 5,
        totalRecords: 0,
        totalPages: 0,
    });

    // Get page, limit, projects, and search from URL params, with defaults
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const selectedProjectsParam = searchParams.get('projects') || '';
    const searchParam = searchParams.get('search') || '';

    const fetchProjects = useCallback(async (pageNum = 1, limitNum = 5, projectsParam = '', searchParamValue = '') => {
        try {
            setLoading(true);
            const params = {
                page: pageNum,
                limit: limitNum,
            };
            
            // Add projects parameter if projects are selected (comma-separated)
            if (projectsParam) {
                params.projects = projectsParam;
            }
            
            // Add search parameter if search is provided
            if (searchParamValue) {
                params.search = searchParamValue;
            }
            
            const response = await axiosInstance.get('/api/projects/getPaginatedProjects', {
                params,
            });

            if (response.data) {
                setProjects(response.data.projects || []);
                const newPagination = {
                    page: response.data.page || pageNum,
                    limit: response.data.limit || limitNum,
                    totalRecords: response.data.totalRecords || 0,
                    totalPages: response.data.totalPages || 0,
                };
                setPagination(newPagination);

                // Update URL with pagination info
                setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('page', (response.data.page || pageNum).toString());
                    newParams.set('limit', (response.data.limit || limitNum).toString());
                    newParams.set('totalPages', (response.data.totalPages || 0).toString());
                    return newParams;
                }, { replace: true });
            }
        } catch (error) {
            console.error('Error fetching projects:', error);
            toast.error('Failed to fetch projects');
        } finally {
            setLoading(false);
        }
    }, [setSearchParams]);

    // Fetch projects when URL params change
    useEffect(() => {
        const pageParam = searchParams.get('page');
        const limitParam = searchParams.get('limit');
        const projectParam = searchParams.get('projects');
        const searchParamValue = searchParams.get('search');

        // Ensure URL has default values if missing
        if (!pageParam || !limitParam) {
            const newParams = new URLSearchParams(searchParams);
            if (!pageParam) newParams.set('page', '1');
            if (!limitParam) newParams.set('limit', '5');
            setSearchParams(newParams, { replace: true });
            return; // Will re-run after setting params
        }

        const pageNum = parseInt(pageParam, 10);
        const limitNum = parseInt(limitParam, 10);
        const projectsParam = projectParam || '';
        const searchValue = searchParamValue || '';

        fetchProjects(pageNum, limitNum, projectsParam, searchValue);
    }, [searchParams, fetchProjects, setSearchParams]);

    if (loading) {
        return (
            <div className="p-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p className="mt-4 text-gray-600">Loading projects...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-100 h-[calc(100vh-48px)] overflow-hidden">
            {/* Projects Grid */}
            {projects.length > 0 ? (
                <div
                    className="grid h-full gap-0"
                    style={{ gridTemplateColumns: `repeat(${pagination.limit}, minmax(0, 1fr))` }}
                >
                    {projects.map((project) => (
                        <ProjectCard key={project.code} project={project} />
                    ))}
                </div>
            ) : (
                <div className="flex items-center justify-center h-full">
                    <div className="bg-white rounded-lg shadow-md p-12 text-center">
                        <p className="text-gray-600 text-lg">No projects found</p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Dashboard;

