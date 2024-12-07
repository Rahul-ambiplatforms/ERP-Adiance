import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import AxiosToastError from "../utils/AxiosToastError";
import successAlert from "../utils/SuccessAlert";
import { utils, writeFile } from "xlsx"; // Import this if not already done


const UploadProduct = () => {
  const [data, setData] = useState({
    category: [],
    subCategory: [],
    description: "",
    boxes: [],
  });
  const allCategory = useSelector((state) => state.product.allCategory);
  const allSubCategory = useSelector((state) => state.product.allSubCategory);
  const [uploadedData, setUploadedData] = useState([]);
  const [excelFile, setExcelFile] = useState(null);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false); // Upload Excel Modal
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false); // Verify Excel Modal
  const ITEMS_PER_PAGE = 20; // Define number of items per page
  const [currentPage, setCurrentPage] = useState(1); // Track current page

  const [selectCategory, setSelectCategory] = useState("");
  const [selectSubCategory, setSelectSubCategory] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false); // Modal visibility
  const [history, setHistory] = useState([]); // Store history
  const [filters, setFilters] = useState({
    date: "",
    category: "",
    subCategory: "",
    box: "",
  }); // Store filters

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);


  const openExcelModal = () => setIsExcelModalOpen(true);
  const closeExcelModal = () => setIsExcelModalOpen(false);

  const openVerifyModal = () => setIsVerifyModalOpen(true);
  const closeVerifyModal = () => setIsVerifyModalOpen(false);

  const handleExcelUpload = async (e) => {
    e.preventDefault();

    if (!excelFile) {
        alert("Please select an Excel file.");
        return;
    }

    const formData = new FormData();
    formData.append("excelFile", excelFile);

    console.log("Uploading Excel File:", excelFile); // Debugging
    console.log("FormData:", formData); // Debugging

    try {
        const response = await Axios.post("/api/product/upload-excel", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.data.success) {
            alert("Excel uploaded successfully");
        } else {
            alert(response.data.message || "Upload failed");
        }
    } catch (error) {
        console.error("Error uploading Excel:", error);
        alert("Error uploading file. Please try again.");
    }
};

  

  useEffect(() => {
    if (isVerifyModalOpen) {
      fetchVerificationData();
    }
  }, [isVerifyModalOpen]);

  // Approve or Reject
// Approve or Reject
const handleApproval = async (index, action, remark = "") => {
  try {
      const row = uploadedData[index];

      if (action === "Yes") {
          // Approve logic: Mark as approved and remove from verify panel
          const updatedData = uploadedData.filter((_, i) => i !== index);
          setUploadedData(updatedData);

          // Update upload status to "Approved"
          await Axios.post(SummaryApi.updateUploadStatus.url, {
              id: row._id,
              status: "Approved",
              remark: "Approved",
          });

          // Automatically call the processUploadedData API
          const processResponse = await Axios.get(SummaryApi.processUploadedData.url, {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });

          if (processResponse.data.success) {
              alert("Data processed successfully.");
          } else {
              console.warn("Processing uploaded data failed:", processResponse.data.message);
          }
      } else {
          // Handle rejection logic
          const updatedData = [...uploadedData];
          updatedData[index].remark = remark || "Rejected";
          setUploadedData(updatedData);

          await Axios.post(SummaryApi.updateUploadStatus.url, {
              id: row._id,
              status: "Rejected",
              remark,
          });
      }
  } catch (error) {
      console.error("Error in handleApproval:", error);
      alert("An error occurred. Please try again.");
  }
};

const fetchRejectedData = async () => {
  try {
      const response = await Axios.get(SummaryApi.getRejectedData.url, {
          headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
      });

      if (response.data.success) {
          const rejectedData = response.data.data.map((item) => ({
              categoryName: item.categoryName || "N/A",
              subCategoryName: item.subCategoryName || "N/A",
              subCategoryCode: "N/A", // Rejected data might not have a code
              boxNo: item.boxNo || "N/A",
              partsQty: item.qty || 0,
              description: item.remark || "Rejected", // Show remark as description
              date: new Intl.DateTimeFormat("en-GB").format(new Date()), // Use current date
          }));

          setHistory((prev) => [...prev, ...rejectedData]); // Append rejected data to history
      } else {
          console.warn("No rejected data found");
      }
  } catch (error) {
      console.error("Error fetching rejected data:", error.response?.data || error.message);
  }
};




  // Fetch Verification Data
  const fetchVerificationData = async () => {
    try {
        const response = await Axios.get(SummaryApi.getUploadDetails.url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`, // If using authentication
            },
        });

        if (response.data.success) {
            console.log("Fetched Upload Details:", response.data.data);
            setUploadedData(response.data.data);
        } else {
            console.warn("No pending uploads found");
        }
    } catch (error) {
        console.error("Error fetching verification data:", error.response?.data || error.message);
    }
};

  


  // Fetch upload history
  const fetchHistory = async () => {
    try {
        // Fetch approved/processed data
        const productResponse = await Axios(SummaryApi.getProduct);
        const productData = productResponse.data.success ? productResponse.data.data : [];

        // Fetch rejected data
        const rejectedResponse = await Axios.get(SummaryApi.getRejectedData.url, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
        });
        const rejectedData = rejectedResponse.data.success ? rejectedResponse.data.data : [];

        // Format combined data
        const combinedData = [
            ...productData.map((item) => ({
                categoryName: item.category[0]?.name || "N/A",
                subCategoryName: item.subCategory[0]?.name || "N/A",
                subCategoryCode: item.subCategory[0]?.code || "N/A",
                boxNo: item.boxes.map((box) => box.boxNo).join(", ") || "N/A",
                partsQty: item.boxes.reduce((total, box) => total + box.partsQty, 0),
                description: item.description || "N/A",
                date: new Intl.DateTimeFormat("en-GB").format(new Date(item.createdAt)),
                partsCode: "", // No partsCode for approved products
            })),
            ...rejectedData.map((item) => ({
                categoryName: item.categoryName || "N/A",
                subCategoryName: item.subCategoryName || "N/A",
                subCategoryCode: "", // No subCategoryCode for rejected products
                boxNo: item.boxNo || "N/A",
                partsQty: item.qty || 0,
                description: item.remark || "Rejected",
                date: new Intl.DateTimeFormat("en-GB").format(new Date(item.createdAt || Date.now())),
                partsCode: item.partsCode || "N/A",
            })),
        ];

        setHistory(combinedData);
        console.log("Combined History Data:", combinedData);
    } catch (error) {
        console.error("Error fetching history:", error);
        alert("Error fetching history. Please try again.");
    }
};

  

  useEffect(() => {
    fetchHistory(); // Fetch history on component load
  }, []);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
    console.log("Updated Filters:", { ...filters, [name]: value });
  };

  
  // Apply filters to history
  const applyFilters = () => {
    console.log("Filters:", filters); // Log the filters for debugging
    return history.filter((item) => {
      // Convert filter date to the same format as item.date for comparison
      const filterDate = filters.date
        ? new Intl.DateTimeFormat("en-GB").format(new Date(filters.date))
        : null;
  
      const matchesDate = !filterDate || item.date === filterDate;
      const matchesCategory = !filters.category || item.categoryName.toLowerCase() === filters.category.toLowerCase();
      const matchesSubCategory =
        !filters.subCategory || item.subCategoryName.toLowerCase() === filters.subCategory.toLowerCase();
      const matchesBox = !filters.box || item.boxNo.toLowerCase().includes(filters.box.toLowerCase());
  
      // Log each condition for debugging
      console.log({
        item,
        matchesDate,
        matchesCategory,
        matchesSubCategory,
        matchesBox,
      });
  
      return matchesDate && matchesCategory && matchesSubCategory && matchesBox;
    });
  };
  
  

  const filteredHistory = applyFilters();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAddBox = () => {
    setData((prev) => ({
      ...prev,
      boxes: [...prev.boxes, { boxNo: "", partsQty: "" }],
    }));
  };

  const handleBoxChange = (index, field, value) => {
    const updatedBoxes = [...data.boxes];
    updatedBoxes[index][field] = value;
    setData((prev) => ({
      ...prev,
      boxes: updatedBoxes,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const requestData = {
        ...data,
        boxes: data.boxes.map((box) => ({
          boxNo: box.boxNo,
          partsQty: box.partsQty,
        })),
      };

      const response = await Axios({
        ...SummaryApi.createProduct,
        data: requestData,
      });

      if (response.data.success) {
        successAlert(response.data.message);
        setData({
          category: [],
          subCategory: [],
          description: "",
          boxes: [],
        });
        setIsModalOpen(false); // Close modal after submission
        fetchHistory(); // Refresh history after upload
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };


  const downloadHistory = () => {
    if (filteredHistory.length === 0) {
      alert("No history available to download!");
      return;
    }
  
    // Convert filtered history into Excel format
    const worksheet = utils.json_to_sheet(filteredHistory);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "History");
  
    // Download the file
    writeFile(workbook, "Uploaded_Parts_History.xlsx");
  };


  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

const paginatedHistory = filteredHistory.slice(
  (currentPage - 1) * ITEMS_PER_PAGE,
  currentPage * ITEMS_PER_PAGE
);

const handlePageChange = (newPage) => {
  if (newPage >= 1 && newPage <= totalPages) {
    setCurrentPage(newPage);
  }
};

  
  return (
    <section className="bg-white">
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex items-center justify-between bg-white shadow-md p-4 rounded mb-4">
          <h2 className="font-semibold text-lg">Inward Camera Part</h2>
          <div className="flex gap-2">
            <button
              className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              onClick={openModal}
            >
              Upload Parts
            </button>
            <button
              className="bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
              onClick={openExcelModal}
            >
              Upload by Excel
            </button>
            <button
              className="bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600"
              onClick={openVerifyModal}
            >
              Verify by Excel
            </button>
            {/* Download Excel Template Button */}
            <a
              href="/ERP_Template.xlsx" // File is served from the public folder
              download="ERP_Template.xlsx"
              className="bg-teal-500 text-white py-2 px-4 rounded hover:bg-teal-600"
            >
              Download Template
            </a>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-gray-100 p-4 rounded mb-4">
        <h3 className="font-semibold text-md mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Date Filter */}
          <div>
            <label className="font-medium block mb-1">Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              name="date"
              value={filters.date}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, date: e.target.value }))
              }
            />
          </div>
          
          {/* Category Filter */}
          <div>
            <label className="font-medium block mb-1">Category</label>
            <select
              className="w-full p-2 border rounded"
              name="category"
              value={filters.category}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, category: e.target.value }))
              }
            >
              <option value="">All Categories</option>
              {allCategory.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sub Category Filter */}
          <div>
            <label className="font-medium block mb-1">Sub Category</label>
            <select
              className="w-full p-2 border rounded"
              name="subCategory"
              value={filters.subCategory}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, subCategory: e.target.value }))
              }
            >
              <option value="">All Sub Categories</option>
              {allSubCategory.map((sub) => (
                <option key={sub._id} value={sub.name}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>

          {/* Box Number Filter */}
          <div>
            <label className="font-medium block mb-1">Box No.</label>
            <input
              type="text"
              className="w-full p-2 border rounded"
              name="box"
              value={filters.box}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, box: e.target.value }))
              }
              placeholder="Enter Box No."
            />
          </div>
        </div>
      </div>


        {/* History Table */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-md">Uploaded Parts History</h3>
            <button
              onClick={downloadHistory}
              className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600"
            >
              Download
            </button>
          </div>
          <div className="overflow-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-blue-50">
                  <th className="border border-gray-300 px-4 py-2">Camera Name</th>
                  <th className="border border-gray-300 px-4 py-2">Parts Name</th>
                  <th className="border border-gray-300 px-4 py-2">Code</th>
                  <th className="border border-gray-300 px-4 py-2">Box No.</th>
                  <th className="border border-gray-300 px-4 py-2">Qty</th>
                  <th className="border border-gray-300 px-4 py-2">Description</th>
                  <th className="border border-gray-300 px-4 py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHistory.length > 0 ? (
                  paginatedHistory.map((item, index) => (
                    <tr
                      key={index}
                      className={`text-center ${
                        item.description.toLowerCase().includes("not") ? "bg-red-100" : ""
                      }`}
                    >
                      <td className="border border-gray-300 px-4 py-2">{item.categoryName}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.subCategoryName}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {item.subCategoryCode || item.partsCode || "N/A"}
                      </td>
                      <td className="border border-gray-300 px-4 py-2">{item.boxNo}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.partsQty}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.description}</td>
                      <td className="border border-gray-300 px-4 py-2">{item.date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan="7"
                      className="text-center text-gray-500 border border-gray-300 px-4 py-2"
                    >
                      No history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>


        {totalPages > 1 && (
  <div className="flex justify-between items-center mt-4">
    <button
      onClick={() => handlePageChange(currentPage - 1)}
      disabled={currentPage === 1}
      className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
    >
      Previous
    </button>
    <span>
      Page {currentPage} of {totalPages}
    </span>
    <button
      onClick={() => handlePageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
    >
      Next
    </button>
  </div>
)}



        {/* Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-md relative">
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
                onClick={closeModal}
              >
                ×
              </button>
              <h2 className="font-semibold text-lg mb-4">Upload Parts</h2>
              <form className="grid gap-4" onSubmit={handleSubmit}>
                {/* Select Category */}
                <div className="grid gap-1">
                  <label className="font-medium">Select Camera Category</label>
                  <select
                    className="bg-blue-50 border w-full p-2 rounded"
                    value={selectCategory}
                    onChange={(e) => {
                      const value = e.target.value;
                      const category = allCategory.find((el) => el._id === value);
                      setData((prev) => ({
                        ...prev,
                        category: [category],
                        subCategory: [],
                      }));
                      setSelectCategory(value);
                    }}
                  >
                    <option value="">Select Camera</option>
                    {allCategory.map((c) => (
                      <option value={c._id} key={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Select Sub Category */}
                <div className="grid gap-1">
                  <label className="font-medium">Select Camera Part</label>
                  <select
                    className="bg-blue-50 border w-full p-2 rounded"
                    value={selectSubCategory}
                    onChange={(e) => {
                      const value = e.target.value;
                      const subCategory = allSubCategory.find(
                        (el) => el._id === value
                      );
                      setData((prev) => ({
                        ...prev,
                        subCategory: [subCategory],
                      }));
                      setSelectSubCategory(value);
                    }}
                  >
                    <option value="">Select Part</option>
                    {allSubCategory
                      .filter((sub) =>
                        sub.category.some((cat) => cat._id === selectCategory)
                      )
                      .map((sub) => (
                        <option value={sub._id} key={sub._id}>
                          {`${sub.code} - ${sub.name}`}
                        </option>
                      ))}
                  </select>
                </div>

                {/* Add Box */}
                <div>
                  <button
                    type="button"
                    className="hover:bg-primary-200 bg-white py-1 px-3 w-32 text-center font-semibold border border-primary-200 hover:text-neutral-900 cursor-pointer rounded"
                    onClick={handleAddBox}
                  >
                    Add Box
                  </button>
                  {data.boxes.map((box, index) => (
                    <div className="grid grid-cols-2 gap-4 mt-2" key={index}>
                      <input
                        type="text"
                        placeholder="Box No."
                        value={box.boxNo}
                        onChange={(e) => handleBoxChange(index, "boxNo", e.target.value)}
                        className="bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded"
                      />
                      <input
                        type="number"
                        placeholder="Parts Qty"
                        value={box.partsQty}
                        onChange={(e) => handleBoxChange(index, "partsQty", e.target.value)}
                        className="bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded"
                      />
                    </div>
                  ))}

                  {/* Total Box and Total Parts Quantity */}
                  <div className="flex justify-between text-sm text-gray-600 mt-2">
                    <span>Total Box: {data.boxes.length}</span>
                    <span>
                      Total Parts Quantity:{" "}
                      {data.boxes.reduce(
                        (total, box) => total + Number(box.partsQty || 0),
                        0
                      )}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="grid gap-1">
                  <label htmlFor="description" className="font-medium">
                    Description
                  </label>
                  <textarea
                    id="description"
                    placeholder="Enter product description (optional)"
                    name="description"
                    value={data.description}
                    onChange={handleChange}
                    rows={3}
                    className="bg-blue-50 p-2 outline-none border focus-within:border-primary-200 rounded resize-none"
                  />
                </div>

                {/* Submit */}
                <button className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600">
                  Submit
                </button>
              </form>
            </div>
          </div>
        )}

                {/* Upload Excel Modal */}
                {isExcelModalOpen && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded shadow-lg w-full max-w-md relative">
                  {/* Close Button */}
                  <button
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
                    onClick={closeExcelModal}
                  >
                    ×
                  </button>
                  
                  {/* Modal Title */}
                  <h2 className="font-semibold text-lg mb-4">Upload Parts via Excel</h2>
                  
                  {/* Form Section */}
                  <form onSubmit={handleExcelUpload} className="space-y-4">
                    
                    {/* Category Dropdown */}
                    <div>
                      <label className="block font-medium mb-1">Select Camera Category</label>
                      <select
                        className="w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300"
                        value={selectCategory}
                        onChange={(e) => setSelectCategory(e.target.value)}
                      >
                        <option value="">Select Category</option>
                        {allCategory.map((cat) => (
                          <option key={cat._id} value={cat._id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {/* File Input */}
                    <div>
                      <label className="block font-medium mb-1">Upload Excel File</label>
                      <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={(e) => setExcelFile(e.target.files[0])}
                        className="block w-full p-2 border border-gray-300 rounded focus:outline-none focus:ring focus:ring-blue-300"
                      />
                    </div>
                    
                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
                    >
                      Upload
                    </button>
                  </form>
                </div>
              </div>
            )}


        {/* Verify Excel Modal */}
        {isVerifyModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl relative">
              <button
                className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
                onClick={closeVerifyModal}
              >
                ×
              </button>
              <h2 className="font-semibold text-lg mb-4">Verify Uploaded Excel Data</h2>
              <div className="table-wrapper overflow-y-auto max-h-[400px]">
                <table className="w-full border-collapse border border-gray-200">
                  <thead>
                    <tr className="bg-blue-50">
                      <th className="border border-gray-300 px-4 py-2">Parts Name</th>
                      <th className="border border-gray-300 px-4 py-2">Parts Code</th>
                      <th className="border border-gray-300 px-4 py-2">Box No</th>
                      <th className="border border-gray-300 px-4 py-2">Qty</th>
                      <th className="border border-gray-300 px-4 py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                {uploadedData.map((item, index) => (
                  <tr key={index} className="bg-white">
                    <td className="border border-gray-300 px-4 py-2">{item.partsName}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.partsCode}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.boxNo}</td>
                    <td className="border border-gray-300 px-4 py-2">{item.qty}</td>
                    <td className="border border-gray-300 px-4 py-2">
                      <button
                        onClick={() => handleApproval(index, "Yes")}
                        className="bg-green-500 text-white px-3 py-1 rounded"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => handleApproval(index, "No", prompt("Enter remark:"))}
                        className="bg-red-500 text-white px-3 py-1 rounded ml-2"
                      >
                        No
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>
    </section>
  );
};

export default UploadProduct;


