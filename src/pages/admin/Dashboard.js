import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import axiosInstance from '../../utils/axiosInstance';
import { getProjectByCode } from '../../services/projectService';
import ProjectCard from '../../components/ProjectCard';
import toast from 'react-hot-toast';

// Normalize project data to ensure SCL and pro_plan are always arrays
const normalizeProject = (project) => {
    if (!project) return project;

    const normalized = { ...project };

    // Normalize SCL - ensure it's always an array
    if (normalized.SCL) {
        if (typeof normalized.SCL === 'string') {
            try {
                normalized.SCL = JSON.parse(normalized.SCL);
            } catch (e) {
                // If parsing fails, treat as single item array
                normalized.SCL = [normalized.SCL];
            }
        }
        if (!Array.isArray(normalized.SCL)) {
            normalized.SCL = [];
        }
    } else {
        normalized.SCL = [];
    }

    // Normalize pro_plan - ensure it's always an array
    if (normalized.pro_plan) {
        if (typeof normalized.pro_plan === 'string') {
            try {
                normalized.pro_plan = JSON.parse(normalized.pro_plan);
            } catch (e) {
                // If parsing fails, treat as single item array
                normalized.pro_plan = [normalized.pro_plan];
            }
        }
        if (!Array.isArray(normalized.pro_plan)) {
            normalized.pro_plan = [];
        }
    } else {
        normalized.pro_plan = [];
    }

    return normalized;
};

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

    const fetchProjects = useCallback(async (pageNum = 1, limitNum = 5, projectsParam = '', searchParamValue = '', silent = false) => {
        try {
            // Only show loader for non-silent (user-triggered) fetches
            if (!silent) {
                setLoading(true);
            }

            // Handle selected projects and search separately
            const fetchedProjects = [];
            let selectedProjectsResponse = null;

            // If projects are selected, use get_selected_projects API
            if (projectsParam) {
                try {
                    selectedProjectsResponse = await axiosInstance.get('/api/projects/get_selected_projects', {
                        params: {
                            projects: projectsParam,
                            page: pageNum,
                            limit: limitNum
                        }
                    });

                    if (selectedProjectsResponse.data) {
                        // Handle different response structures
                        let projectsArray = [];
                        if (Array.isArray(selectedProjectsResponse.data.projects)) {
                            projectsArray = selectedProjectsResponse.data.projects;
                        } else if (Array.isArray(selectedProjectsResponse.data)) {
                            projectsArray = selectedProjectsResponse.data;
                        } else if (selectedProjectsResponse.data.projects && typeof selectedProjectsResponse.data.projects === 'object') {
                            projectsArray = [selectedProjectsResponse.data.projects];
                        }

                        // Normalize each project before adding
                        projectsArray.forEach(project => {
                            fetchedProjects.push(normalizeProject(project));
                        });
                    }
                } catch (error) {
                    console.error('Error fetching selected projects:', error);
                    if (!silent) {
                        toast.error('Failed to fetch selected projects');
                    }
                }
            }

            // If search is used, fetch by code using getProjectByCode
            if (searchParamValue) {
                try {
                    const searchResponse = await getProjectByCode(searchParamValue);

                    if (searchResponse && searchResponse.status === 200 && searchResponse.data) {
                        // Handle different response structures
                        let projectData = null;
                        if (searchResponse.data.projects && Array.isArray(searchResponse.data.projects)) {
                            projectData = searchResponse.data.projects[0];
                        } else if (searchResponse.data.projects && typeof searchResponse.data.projects === 'object') {
                            projectData = searchResponse.data.projects;
                        } else if (searchResponse.data.project) {
                            projectData = searchResponse.data.project;
                        } else if (searchResponse.data && typeof searchResponse.data === 'object' && !searchResponse.data.projects) {
                            projectData = searchResponse.data;
                        }

                        if (projectData) {
                            // Check if project is already in the list (avoid duplicates)
                            const isDuplicate = fetchedProjects.some(p => p.code === projectData.code || String(p.code) === String(projectData.code));
                            if (!isDuplicate) {
                                // Normalize project before adding
                                fetchedProjects.push(normalizeProject(projectData));
                            }
                        }
                    }
                } catch (error) {
                    console.error(`Error fetching project with code ${searchParamValue}:`, error);
                    if (!silent) {
                        toast.error('Failed to fetch searched project');
                    }
                }
            }

            // If we have fetched projects from selected/search, use them instead of paginated API
            if (fetchedProjects.length > 0) {
                setProjects(fetchedProjects);

                // Get pagination from response if available, otherwise use defaults
                let paginationData = {
                    page: pageNum,
                    limit: limitNum,
                    totalRecords: fetchedProjects.length,
                    totalPages: 1,
                };

                // Extract pagination info from selected projects API response if available
                if (selectedProjectsResponse && selectedProjectsResponse.data) {
                    if (selectedProjectsResponse.data.page !== undefined) {
                        paginationData.page = selectedProjectsResponse.data.page;
                    }
                    if (selectedProjectsResponse.data.limit !== undefined) {
                        paginationData.limit = selectedProjectsResponse.data.limit;
                    }
                    if (selectedProjectsResponse.data.totalRecords !== undefined) {
                        paginationData.totalRecords = selectedProjectsResponse.data.totalRecords;
                    }
                    if (selectedProjectsResponse.data.totalPages !== undefined) {
                        paginationData.totalPages = selectedProjectsResponse.data.totalPages;
                    }
                }

                setPagination(paginationData);

                // Update URL with pagination info
                setSearchParams(prev => {
                    const newParams = new URLSearchParams(prev);
                    newParams.set('page', paginationData.page.toString());
                    newParams.set('limit', paginationData.limit.toString());
                    newParams.set('totalPages', paginationData.totalPages.toString());
                    return newParams;
                }, { replace: true });

                if (!silent) {
                    setLoading(false);
                }
                return;
            }

            // Default: Use paginated API when no projects/search are selected
            const params = {
                page: pageNum,
                limit: limitNum,
            };

            const response = await axiosInstance.get('/api/projects/getPaginatedProjects', {
                params,
            });

            if (response.data) {
                // Normalize projects from paginated API as well
                const projects = (response.data.projects || []).map(project => normalizeProject(project));
                setProjects(projects);
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
            // Only show error toast for non-silent fetches to avoid spam
            if (!silent) {
                toast.error('Failed to fetch projects');
            }
        } finally {
            // Only update loading state for non-silent fetches
            if (!silent) {
                setLoading(false);
            }
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

    // Auto-refresh projects every 30 seconds
    useEffect(() => {
        const pageParam = searchParams.get('page');
        const limitParam = searchParams.get('limit');
        const projectParam = searchParams.get('projects');
        const searchParamValue = searchParams.get('search');

        // Only set up interval if we have valid params
        if (!pageParam || !limitParam) {
            return;
        }

        const pageNum = parseInt(pageParam, 10);
        const limitNum = parseInt(limitParam, 10);
        const projectsParam = projectParam || '';
        const searchValue = searchParamValue || '';

        // Set up interval to fetch projects every 30 seconds (silent refresh)
        const intervalId = setInterval(() => {
            fetchProjects(pageNum, limitNum, projectsParam, searchValue, true); // true = silent refresh
        }, 30000); // 30 seconds

        // Cleanup interval on unmount or when dependencies change
        return () => {
            clearInterval(intervalId);
        };
    }, [searchParams, fetchProjects]);

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

