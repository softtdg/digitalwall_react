import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getOciUrl } from '../utils/ociUrl';
import { Dialog, DialogTitle, DialogContent, IconButton, Box, Button, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import * as XLSX from 'xlsx';

const ProjectCard = ({ project }) => {
    const [searchParams] = useSearchParams();
    const limit = parseInt(searchParams.get('limit') || '5', 10);
    const isCompactMode = limit >= 8;

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState(null);
    const [selectedFileType, setSelectedFileType] = useState(null);
    const [xlsxData, setXlsxData] = useState(null);
    const [loadingXlsx, setLoadingXlsx] = useState(false);

    const handleFileSelect = (file, fileType) => {
        if (!file) return;

        // Get the file path - handle both object and string formats
        let filePath = null;
        if (typeof file === 'object' && file !== null) {
            // Try multiple possible property names for the file path
            filePath = file.filename || file.originalname || file.path || file.url || file.location;
        } else if (typeof file === 'string') {
            filePath = file;
        }

        if (filePath) {
            // Use getOciUrl to construct the full URL (handles OCI paths, full URLs, and data URLs)
            const fileUrl = getOciUrl(filePath);
            if (fileUrl) {
                setSelectedFile(fileUrl);
                setSelectedFileType(fileType);
                setModalOpen(true);
            } else {
                console.warn('Could not construct URL for file:', filePath);
            }
        } else {
            console.warn('Could not extract file path from:', file);
        }
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setSelectedFile(null);
        setSelectedFileType(null);
        setXlsxData(null);
        setLoadingXlsx(false);
    };

    const getFileExtension = (url) => {
        if (!url) return '';
        const match = url.match(/\.([^.?#]+)(?:[?#]|$)/);
        return match ? match[1].toLowerCase() : '';
    };

    // Fetch and parse XLSX file
    useEffect(() => {
        const fetchAndParseXlsx = async () => {
            if (!selectedFile) return;

            const extension = getFileExtension(selectedFile);
            if (extension !== 'xlsx' && extension !== 'xls') {
                setXlsxData(null);
                return;
            }

            setLoadingXlsx(true);
            try {
                const response = await fetch(selectedFile);
                const arrayBuffer = await response.arrayBuffer();

                // Try to read with raw option to get more style information
                const workbook = XLSX.read(arrayBuffer, {
                    type: 'array',
                    cellStyles: true,
                    cellNF: true,
                    cellHTML: false,
                    raw: false,
                    dense: false
                });

                // Get the first sheet
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];

                // Get the range of the sheet
                const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

                // Parse cells with their styles
                const cellData = [];
                const cellStyles = {};

                // Helper function to convert Excel color to hex
                const getColorHex = (colorObj) => {
                    if (!colorObj) return null;

                    // Direct RGB value
                    if (colorObj.rgb) {
                        return `#${colorObj.rgb}`;
                    }

                    // Indexed color
                    if (colorObj.indexed !== undefined) {
                        const indexedColors = [
                            '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00',
                            '#FF00FF', '#00FFFF', '#800000', '#008000', '#000080', '#808000',
                            '#800080', '#008080', '#C0C0C0', '#808080', '#9999FF', '#993366',
                            '#FFFFCC', '#CCFFFF', '#660066', '#FF8080', '#0066CC', '#CCCCFF',
                            '#000080', '#FF00FF', '#FFFF00', '#00FFFF', '#800080', '#800000',
                            '#008080', '#0000FF', '#00CCFF', '#CCFFFF', '#CCFFCC', '#FFFF99',
                            '#99CCFF', '#FF99CC', '#CC99FF', '#FFCC99', '#3366FF', '#33CCCC',
                            '#99CC00', '#FFCC00', '#FF9900', '#FF6600', '#666699', '#969696',
                            '#003366', '#339966', '#003300', '#333300', '#993300', '#993366',
                            '#333399', '#333333'
                        ];
                        return indexedColors[colorObj.indexed] || null;
                    }

                    // Theme color (simplified mapping)
                    if (colorObj.theme !== undefined) {
                        // Common Excel theme colors
                        const themeColorMap = {
                            0: '#FFFFFF', // Background 1
                            1: '#000000', // Text 1
                            2: '#1F497D', // Background 2
                            3: '#EEECE1', // Text 2
                            4: '#4F81BD', // Accent 1
                            5: '#F79646', // Accent 2
                            6: '#9BBB59', // Accent 3
                            7: '#8064A2', // Accent 4
                            8: '#4BACC6', // Accent 5
                            9: '#F79646', // Accent 6
                        };
                        return themeColorMap[colorObj.theme] || '#000000';
                    }

                    return null;
                };

                // Iterate through all cells
                for (let R = range.s.r; R <= range.e.r; R++) {
                    const row = [];
                    for (let C = range.s.c; C <= range.e.c; C++) {
                        const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                        const cell = worksheet[cellAddress];

                        if (cell) {
                            // Get cell value
                            const value = cell.v !== undefined ? cell.v : '';
                            row.push(value);

                            // Extract style information - check multiple possible locations
                            const style = {};

                            // Check cell.s (style object) - primary location
                            let cellStyle = cell.s;

                            // If cell.s doesn't exist, try to get from workbook styles using cell style index
                            if (!cellStyle && cell.z !== undefined && workbook.Styles) {
                                // cell.z might be a style index
                                const styleIndex = typeof cell.z === 'number' ? cell.z : null;
                                if (styleIndex !== null && workbook.Styles.CellXf && workbook.Styles.CellXf[styleIndex]) {
                                    cellStyle = workbook.Styles.CellXf[styleIndex];
                                }
                            }

                            // Also check if there's a direct style reference
                            if (!cellStyle && cell.style !== undefined) {
                                cellStyle = cell.style;
                            }

                            if (cellStyle) {
                                // Background color (fill)
                                const fill = cellStyle.fill || cellStyle.patternFill || {};

                                // Try foreground color first
                                const fgColor = fill.fgColor || fill.foregroundColor || {};
                                const bgColorHex = getColorHex(fgColor);
                                if (bgColorHex) {
                                    style.backgroundColor = bgColorHex;
                                } else {
                                    // Try background color
                                    const bgColor = fill.bgColor || fill.backgroundColor || {};
                                    const bgColorHex2 = getColorHex(bgColor);
                                    if (bgColorHex2) {
                                        style.backgroundColor = bgColorHex2;
                                    }
                                }

                                // Text color (font color)
                                const font = cellStyle.font || {};
                                const fontColor = font.color || font.fontColor || {};
                                const textColorHex = getColorHex(fontColor);
                                if (textColorHex) {
                                    style.color = textColorHex;
                                }

                                // Font weight (bold)
                                if (font.bold || font.b) {
                                    style.fontWeight = 'bold';
                                }

                                // Font style (italic)
                                if (font.italic || font.i) {
                                    style.fontStyle = 'italic';
                                }

                                // Font size
                                if (font.sz || font.size) {
                                    style.fontSize = `${font.sz || font.size}pt`;
                                }

                                // Alignment
                                const alignment = cellStyle.alignment || {};
                                if (alignment.horizontal || alignment.h) {
                                    style.textAlign = alignment.horizontal || alignment.h;
                                }
                                if (alignment.vertical || alignment.v) {
                                    style.verticalAlign = alignment.vertical || alignment.v;
                                }

                                // Border - check all sides
                                const border = cellStyle.border || {};
                                if (border.top || border.bottom || border.left || border.right) {
                                    const topColor = border.top?.color || {};
                                    const bottomColor = border.bottom?.color || {};
                                    const leftColor = border.left?.color || {};
                                    const rightColor = border.right?.color || {};

                                    const borderColor = getColorHex(topColor) || getColorHex(bottomColor) ||
                                        getColorHex(leftColor) || getColorHex(rightColor) || '#d0d0d0';
                                    style.border = `1px solid ${borderColor}`;
                                }
                            }

                            // Store style for this cell
                            cellStyles[`${R}_${C}`] = style;
                        } else {
                            row.push('');
                        }
                    }
                    cellData.push(row);
                }

                // Also keep the workbook for download
                setXlsxData({
                    jsonData: cellData,
                    cellStyles,
                    workbook,
                    sheetName: firstSheetName,
                    range
                });
            } catch (error) {
                console.error('Error parsing XLSX file:', error);
                setXlsxData(null);
            } finally {
                setLoadingXlsx(false);
            }
        };

        fetchAndParseXlsx();
    }, [selectedFile]);

    const handleDownloadXlsx = () => {
        if (!xlsxData || !selectedFile) return;

        // Create a download link
        const link = document.createElement('a');
        link.href = selectedFile;
        link.download = selectedFile.split('/').pop() || 'file.xlsx';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const renderFileContent = () => {
        if (!selectedFile) return null;

        const extension = getFileExtension(selectedFile);
        const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension);
        const isPdf = extension === 'pdf';
        const isXlsx = extension === 'xlsx' || extension === 'xls';

        if (isImage) {
            return (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', maxHeight: '80vh' }}>
                    <img
                        src={selectedFile}
                        alt="Document"
                        style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }}
                    />
                </Box>
            );
        } else if (isPdf) {
            return (
                <Box sx={{ width: '100%', height: '90vh' }}>
                    <iframe
                        src={selectedFile}
                        style={{ width: '100%', height: '100%', border: 'none' }}
                        title="PDF Document"
                    />
                </Box>
            );
        } else if (isXlsx) {
            return (
                <Box sx={{ p: 3, height: '90vh', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                            {xlsxData?.sheetName || 'Spreadsheet'}
                        </h3>
                        <Button
                            variant="contained"
                            startIcon={<DownloadIcon />}
                            onClick={handleDownloadXlsx}
                            sx={{ ml: 2 }}
                        >
                            Download
                        </Button>
                    </Box>
                    {loadingXlsx ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                            <CircularProgress />
                        </Box>
                    ) : xlsxData && xlsxData.jsonData ? (
                        <Box sx={{ overflow: 'auto', flex: 1, border: '1px solid #e0e0e0', borderRadius: '4px', backgroundColor: '#ffffff' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', backgroundColor: '#ffffff' }}>
                                <tbody>
                                    {xlsxData.jsonData.map((row, rowIndex) => (
                                        <tr key={rowIndex}>
                                            {row.map((cell, cellIndex) => {
                                                const cellStyleKey = `${rowIndex}_${cellIndex}`;
                                                const cellStyle = xlsxData.cellStyles?.[cellStyleKey] || {};

                                                // Default styles
                                                const defaultStyle = {
                                                    padding: '8px 12px',
                                                    border: '1px solid #d0d0d0',
                                                    textAlign: typeof cell === 'number' ? 'right' : 'left',
                                                    whiteSpace: 'nowrap',
                                                    minWidth: '80px'
                                                };

                                                // Merge with cell styles from Excel
                                                const finalStyle = {
                                                    ...defaultStyle,
                                                    backgroundColor: cellStyle.backgroundColor || (rowIndex % 2 === 0 && !cellStyle.backgroundColor ? '#f9f9f9' : '#ffffff'),
                                                    color: cellStyle.color || '#000000',
                                                    fontWeight: cellStyle.fontWeight || 'normal',
                                                    fontStyle: cellStyle.fontStyle || 'normal',
                                                    textAlign: cellStyle.textAlign || defaultStyle.textAlign,
                                                    verticalAlign: cellStyle.verticalAlign || 'middle',
                                                    border: cellStyle.border || defaultStyle.border
                                                };

                                                return (
                                                    <td
                                                        key={cellIndex}
                                                        style={finalStyle}
                                                    >
                                                        {cell !== null && cell !== undefined ? String(cell) : ''}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </Box>
                    ) : (
                        <Box sx={{ p: 3, textAlign: 'center', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <p>Unable to load spreadsheet data.</p>
                            <Button
                                variant="contained"
                                startIcon={<DownloadIcon />}
                                onClick={handleDownloadXlsx}
                                sx={{ mt: 2, alignSelf: 'center' }}
                            >
                                Download File
                            </Button>
                        </Box>
                    )}
                </Box>
            );
        } else {
            // For other file types, provide a download link or open in new tab
            return (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                    <p>This file type cannot be previewed in the browser.</p>
                    <a
                        href={selectedFile}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                            display: 'inline-block',
                            marginTop: '16px',
                            padding: '8px 16px',
                            backgroundColor: '#1976d2',
                            color: 'white',
                            textDecoration: 'none',
                            borderRadius: '4px'
                        }}
                    >
                        Open in New Tab
                    </a>
                </Box>
            );
        }
    };

    const getStatusDiamond = (statusValue) => {
        const val = Number(statusValue); // Convert string → number

        // Status 1: empty
        if (val === 1) {
            return <em className="text-transparent flex-shrink-0"></em>;
        }

        // Status 2: Yellow diamond (16px)
        if (val === 2) {
            return (
                <div className="w-[15px] h-[15px] bg-[rgb(255,215,5)] rotate-45 flex-shrink-0"></div>
            );
        }

        // Status 3: Green diamond (13px)
        if (val === 3) {
            return (
                <div className="w-[12px] h-[12px] bg-green-500 rotate-45 flex-shrink-0"></div>
            );
        }

        // Status 4: Red diamond (22px)
        if (val === 4) {
            return (
                <div className="w-[18px] h-[18px] bg-red-500 rotate-45 flex-shrink-0"></div>
            );
        }

        // Status 5: Two red diamonds (24px)
        if (val === 5) {
            return (
                <div className="flex items-center gap-1 flex-shrink-0" style={{ fontSize: "24px" }}>
                    <div className="w-[18px] h-[18px] bg-red-500 rotate-45 mr-1"></div>
                    <div className="w-[18px] h-[18px] bg-red-500 rotate-45"></div>
                </div>
            );
        }

        // Default: None
        return <em className="text-gray-400 text-xs flex-shrink-0">None</em>;
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    };

    const imageUrl = getOciUrl(project.image);
    const logoUrl = getOciUrl(project.logo);

    return (
        <div className="bg-white border-r border-gray-300 h-full flex flex-col overflow-hidden p-1">
            {/* Header with Project ID, Title, and Logo */}
            <div className="flex-shrink-0 mb-1">
                <div className="flex items-center justify-between pl-1 bg-gray-100 border border-gray-300">
                    <div className="pr-2">
                        <h3 className={`${isCompactMode ? 'text-[16px]' : 'text-[18px]'} font-semibold text-gray-800 leading-tight`}>{project.title}</h3>
                    </div>
                    {logoUrl && (
                        <div style={{
                            width: "fit-content",
                            minHeight: isCompactMode ? "30px" : "40px",
                            backgroundColor: "#fff",
                            borderRadius: "3px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}>
                            <img src={logoUrl} alt="Logo" style={{
                                padding: isCompactMode ? "3px" : "5px",
                                maxWidth: isCompactMode ? "60px" : "90px",
                                maxHeight: isCompactMode ? "30px" : "40px",
                                objectFit: "contain",
                                width: "auto",
                                height: "auto",
                                borderRadius: "0px",
                            }} />
                        </div>
                    )}
                </div>
            </div>

            {/* Project Image with Manager Overlay */}
            {imageUrl && (
                <div className="w-full mb-1 bg-gray-300 flex items-center justify-center overflow-hidden flex-shrink-0 relative" style={{ height: '23%' }}>
                    <img src={imageUrl} alt={project.title} className="w-full h-full object-cover" />
                    {/* Project Manager Overlay */}
                    <div className="absolute bottom-2 right-2 bg-[#0009] px-2 py-1 rounded">
                        <p className={`${isCompactMode ? 'text-[11px]' : 'text-[13px]'} text-white font-medium`}>
                            Project Manager : {project.manager || 'N/A'}
                        </p>
                    </div>
                </div>
            )}

            {/* Metrics Section */}
            <div className="flex flex-col flex-1 overflow-y-auto min-h-0 gap-2">
                {/* Total Contract Deliverables - 1st (odd) */}
                <div className="bg-[#f4f5ff] border border-gray-200 rounded p-1 flex-1 flex flex-col justify-center">
                    <div className={`${isCompactMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-600 mb-1 leading-tight w-full`}>
                        <span className={`${isCompactMode ? 'text-[12px]' : 'text-[14px]'} text-black`}>Total Contract Deliverables</span> / Fixtures + Files + Legal
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={`${isCompactMode ? 'text-[16px]' : 'text-[20px]'} font-bold text-[#003a5d]`}>
                            {project.fixture} {project?.files?.toString() ? "+" : ""} {project.files}{" "}
                            {project?.legal?.toString() ? "+" : ""} {project.legal}                        </div>
                        <div className="flex-shrink-0">
                            {getStatusDiamond(project.cont_del_sts)}
                        </div>
                    </div>
                </div>

                {/* FUD & Risk Status - 2nd (even) */}
                <div className="bg-white border border-gray-200 rounded p-1 flex-1 flex flex-col justify-center">
                    <div className={`${isCompactMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-600 mb-1 leading-tight w-full`}>
                        <span className={`${isCompactMode ? 'text-[12px]' : 'text-[14px]'} text-black`}>FUD & Risk status</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={`${isCompactMode ? 'text-[16px]' : 'text-[20px]'} font-bold text-[#003a5d]`}>
                            {formatDate(project.risk_status)}
                        </div>
                        <div className="flex-shrink-0">
                            {getStatusDiamond(project.risk_sts)}
                        </div>
                    </div>
                </div>

                {/* Component Drawings - 3rd (odd) */}
                <div className="bg-[#f4f5ff] border border-gray-200 rounded p-1 flex-1 flex flex-col justify-center">
                    <div className={`${isCompactMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-600 mb-1 leading-tight w-full`}>
                        <span className={`${isCompactMode ? 'text-[12px]' : 'text-[14px]'} text-black`}>Component Drawings</span> / Drawings Open
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={`${isCompactMode ? 'text-[16px]' : 'text-[20px]'} font-bold text-[#003a5d]`}>
                            {project.comp_drawing_rem} / {project.comp_drawing_total}
                        </div>
                        <div className="flex-shrink-0">
                            {getStatusDiamond(project.comp_drawing_sts)}
                        </div>
                    </div>
                </div>

                {/* Parts To Buy - 4th (even) */}
                <div className="bg-white border border-gray-200 rounded p-1 flex-1 flex flex-col justify-center">
                    <div className={`${isCompactMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-600 mb-1 leading-tight w-full`}>
                        <span className={`${isCompactMode ? 'text-[12px]' : 'text-[14px]'} text-black`}>Parts To Buy (PBOM)</span> / Parts Open
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={`${isCompactMode ? 'text-[16px]' : 'text-[20px]'} font-bold text-[#003a5d]`}>
                            {project.parts_to_buy_rem} / {project.parts_to_buy_total}
                        </div>
                        <div className="flex-shrink-0">
                            {getStatusDiamond(project.parts_to_buy_sts)}
                        </div>
                    </div>
                </div>

                {/* Production Readiness - 5th (odd) */}
                <div className="bg-[#f4f5ff] border border-gray-200 rounded p-1 flex-1 flex flex-col justify-center">
                    <div className={`${isCompactMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-600 mb-1 leading-tight w-full`}>
                        <span className={`${isCompactMode ? 'text-[12px]' : 'text-[14px]'} text-black`}>Production Readiness</span> / Fixtures Open
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={`${isCompactMode ? 'text-[16px]' : 'text-[20px]'} font-bold text-[#003a5d]`}>
                            {project.pro_readiness_rem} / {project.pro_readiness_total}
                        </div>
                        <div className="flex-shrink-0">
                            {getStatusDiamond(project.pro_readiness_sts)}
                        </div>
                    </div>
                </div>

                {/* Contract Deliverables - 6th (even) */}
                <div className="bg-white border border-gray-200 rounded p-1 flex-1 flex flex-col justify-center">
                    <div className={`${isCompactMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-600 mb-1 leading-tight w-full`}>
                        <span className={`${isCompactMode ? 'text-[12px]' : 'text-[14px]'} text-black`}>Contract Deliverables</span> / Deliverables
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={`${isCompactMode ? 'text-[16px]' : 'text-[20px]'} font-bold text-[#003a5d]`}>
                            {project.cont_deliverable_rem} / {project.cont_deliverable_total}
                        </div>
                        <div className="flex-shrink-0">
                            {getStatusDiamond(project.cont_deliverable_sts)}
                        </div>
                    </div>
                </div>

                {/* NRC Amount - 7th (odd) */}
                <div className="bg-[#f4f5ff] border border-gray-200 rounded p-1 flex-1 flex flex-col justify-center">
                    <div className={`${isCompactMode ? 'text-[10px]' : 'text-[11px]'} font-semibold text-gray-600 mb-1 leading-tight w-full`}>
                        <span className={`${isCompactMode ? 'text-[12px]' : 'text-[14px]'} text-black`}>NRC Amount</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className={`${isCompactMode ? 'text-[16px]' : 'text-[20px]'} font-bold text-[#003a5d]`}>
                            {/* Only show NRC values when there is a nonzero amount */}
                            {Number(project.amount) > 0 || Number(project.amount_rem) > 0 ? (
                                <>
                                    {project.amount_rem ? project.amount_rem : "0"} {project.currencySymbol}{" "}
                                    {project.currencyCode} / {project.amount ? project.amount : "0"}{" "}
                                    {project.currencySymbol} {project.currencyCode}{" "}
                                </>
                            ) : (
                                // Render nothing if both are zero (and thus, "No NRC" shouldn't be shown)
                                <p style={{ textAlign: "center" }}>No NRC</p>
                            )}
                        </div>
                        <div className="flex-shrink-0">
                            {getStatusDiamond(project.amount_sts)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Dropdowns */}
            <div className="p-3 border-t border-gray-300 bg-gray-50 flex-shrink-0">
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SCL</label>
                        <select
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                                const selectedIndex = e.target.selectedIndex - 1; // -1 for "Documents" option
                                if (selectedIndex >= 0 && project.SCL && project.SCL[selectedIndex]) {
                                    handleFileSelect(project.SCL[selectedIndex], 'SCL');
                                    e.target.value = ''; // Reset dropdown
                                }
                            }}
                        >
                            <option value="">Documents</option>
                            {project.SCL && project.SCL.length > 0 ? (
                                project.SCL.map((item, index) => {
                                    const displayName = typeof item === 'object' && item !== null
                                        ? (item.originalname || item.filename || JSON.stringify(item))
                                        : item;
                                    return (
                                        <option key={index} value={index}>{displayName}</option>
                                    );
                                })
                            ) : (
                                <option value="">No documents</option>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">PLAN</label>
                        <select
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                            onChange={(e) => {
                                const selectedIndex = e.target.selectedIndex - 1; // -1 for "Documents" option
                                if (selectedIndex >= 0 && project.pro_plan && project.pro_plan[selectedIndex]) {
                                    handleFileSelect(project.pro_plan[selectedIndex], 'PLAN');
                                    e.target.value = ''; // Reset dropdown
                                }
                            }}
                        >
                            <option value="">Documents</option>
                            {project.pro_plan && project.pro_plan.length > 0 ? (
                                project.pro_plan.map((item, index) => {
                                    const displayName = typeof item === 'object' && item !== null
                                        ? (item.originalname || item.filename || JSON.stringify(item))
                                        : item;
                                    return (
                                        <option key={index} value={index}>{displayName}</option>
                                    );
                                })
                            ) : (
                                <option value="">No documents</option>
                            )}
                        </select>
                    </div>
                </div>
            </div>

            {/* File View Modal */}
            <Dialog
                open={modalOpen}
                onClose={handleCloseModal}
                maxWidth="xl"
                fullWidth
                PaperProps={{
                    sx: {
                        maxHeight: '95vh',
                        width: '90vw',
                        maxWidth: '90vw',
                    }
                }}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{selectedFileType} Document</span>
                    <IconButton
                        onClick={handleCloseModal}
                        size="small"
                        sx={{ ml: 2 }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
                    {renderFileContent()}
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default ProjectCard;

