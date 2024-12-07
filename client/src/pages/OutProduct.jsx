import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import AxiosToastError from "../utils/AxiosToastError";
import successAlert from "../utils/SuccessAlert";
import { combineBoxes } from "../utils";
import { utils, writeFile } from "xlsx"; // Import this if not already done

const OutProduct = () => {
  const allCategory = useSelector((state) => state.product.allCategory);
  const allSubCategory = useSelector((state) => state.product.allSubCategory);

  const [data, setData] = useState({
    category: "",
    subCategory: "",
    box: "",
    quantity: "",
  });

  const [filteredSubCategories, setFilteredSubCategories] = useState([]);
  const [filteredBoxes, setFilteredBoxes] = useState([]);
  const [selectedBoxQty, setSelectedBoxQty] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false); // For toggling the modal
  const [history, setHistory] = useState([]); // State to store the history
  const [filters, setFilters] = useState({
    date: "",
    category: "",
    subCategory: "",
    box: "",
  });

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const ITEMS_PER_PAGE = 20; // Number of items to display per page
  const [currentPage, setCurrentPage] = useState(1); // Initialize current page


  // Fetch history data
  const fetchHistory = async () => {
    try {
      const response = await Axios(SummaryApi.getOutProduct);
      if (response.data.success) {
        const fetchedHistory = response.data.data.map((item) => ({
          categoryName: item.category?.name || "N/A",
          subCategoryName: item.subCategory?.name || "N/A",
          subCategoryCode: item.subCategory?.code || "N/A", // Use populated code
          boxNo: item.box?.boxNo || "Unknown Box", // Use populated boxNo
          partsQty: item.quantity || 0,
          date: new Date(item.createdAt).toLocaleDateString("en-GB"), // Format to DD-MM-YYYY
        }));
  
        // Reverse the fetched history to show the newest first
        setHistory(fetchedHistory.reverse());
      } else {
        console.error("Failed to fetch history:", response.data.message);
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };
  
  
  

  useEffect(() => {
    fetchHistory(); // Fetch history on component mount
  }, []);

  // Update subcategories based on the selected category
  useEffect(() => {
    if (data.category) {
      const filtered = allSubCategory.filter((sub) =>
        sub.category.some((cat) => cat._id === data.category)
      );
      setFilteredSubCategories(filtered);
      setData((prev) => ({ ...prev, subCategory: "", box: "" })); // Reset subCategory and box
      setFilteredBoxes([]); // Clear boxes when category changes
    }
  }, [data.category, allSubCategory]);

  // Fetch boxes for the selected subcategory
  useEffect(() => {
    if (data.category && data.subCategory) {
      const fetchBoxes = async () => {
        try {
          const response = await Axios({
            ...SummaryApi.getProductByCategoryAndSubCategory,
            data: { categoryId: data.category, subCategoryId: data.subCategory },
          });

          if (response.data.success) {
            const boxes = response.data.data
              .map((product) => product.boxes)
              .flat();
            setFilteredBoxes(combineBoxes(boxes)); // Use combineBoxes here
          } else {
            setFilteredBoxes([]);
          }
        } catch (error) {
          AxiosToastError(error);
        }
      };

      fetchBoxes();
    } else {
      setFilteredBoxes([]);
    }
  }, [data.category, data.subCategory]);

  // Update quantity display for the selected box
  useEffect(() => {
    if (data.box) {
      const selectedBox = filteredBoxes.find((box) => box._id === data.box);
      setSelectedBoxQty(selectedBox ? selectedBox.partsQty : 0);
    } else {
      setSelectedBoxQty(0);
    }
  }, [data.box, filteredBoxes]);

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await Axios({
        ...SummaryApi.addOutProduct,
        data,
      });

      if (response.data.success) {
        successAlert(response.data.message);
        setData({ category: "", subCategory: "", box: "", quantity: "" });
        setFilteredBoxes([]);
        setSelectedBoxQty(0);
        closeModal(); // Close modal on successful submission
        fetchHistory(); // Refresh history after submission
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  // Apply filters to history
  const applyFilters = () => {
    return history.filter((item) => {
      // Convert both filter date and item date to a comparable format (DD-MM-YYYY)
      const formattedFilterDate = filters.date
        ? new Date(filters.date).toLocaleDateString("en-GB")
        : null;
  
      return (
        (!formattedFilterDate || item.date === formattedFilterDate) &&
        (!filters.category || item.categoryName === filters.category) &&
        (!filters.subCategory || item.subCategoryName === filters.subCategory) &&
        (!filters.box || item.boxNo.toLowerCase().includes(filters.box.toLowerCase()))
      );
    });
  };
  

  const filteredHistory = applyFilters();

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

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
    writeFile(workbook, "Out_Parts_History.xlsx");
  };

  return (
    <section className="bg-white">
      <div className="container mx-auto p-4">
        {/* Header Section */}
        <div className="flex items-center justify-between bg-white shadow-md p-4 rounded mb-4">
          <h2 className="font-semibold text-lg">Outward Parts</h2>
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            onClick={openModal}
          >
            Out Parts
          </button>
        </div>

        {/* Filters */}
        <div className="bg-gray-100 p-4 rounded mb-4">
          <h3 className="font-semibold text-md mb-4">Filters</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="font-medium block mb-1">Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded"
                value={filters.date}
                onChange={(e) => setFilters((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div>
              <label className="font-medium block mb-1">Category</label>
              <select
                className="w-full p-2 border rounded"
                value={filters.category}
                onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              >
                <option value="">All Categories</option>
                {allCategory.map((cat) => (
                  <option key={cat._id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-medium block mb-1">Sub Category</label>
              <select
                className="w-full p-2 border rounded"
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
            <div>
              <label className="font-medium block mb-1">Box No.</label>
              <input
                type="text"
                className="w-full p-2 border rounded"
                value={filters.box}
                onChange={(e) => setFilters((prev) => ({ ...prev, box: e.target.value }))}
                placeholder="Enter Box No."
              />
            </div>
          </div>
        </div>

        {/* History Table */}
              <div className="mt-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-semibold text-md">Out Product History</h3>
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
                        <th className="border border-gray-300 px-4 py-2">Parts Code</th>
                        <th className="border border-gray-300 px-4 py-2">Box No.</th>
                        <th className="border border-gray-300 px-4 py-2">Qty</th>
                        <th className="border border-gray-300 px-4 py-2">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.length > 0 ? (
                        paginatedHistory.map((item, index) => (
                          <tr key={index} className="text-center">
                            <td className="border border-gray-300 px-4 py-2">{item.categoryName}</td>
                            <td className="border border-gray-300 px-4 py-2">{item.subCategoryName}</td>
                            <td className="border border-gray-300 px-4 py-2">{item.subCategoryCode}</td>
                            <td className="border border-gray-300 px-4 py-2">{item.boxNo}</td>
                            <td className="border border-gray-300 px-4 py-2">{item.partsQty}</td>
                            <td className="border border-gray-300 px-4 py-2">{item.date}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            className="border border-gray-300 px-4 py-2 text-center"
                            colSpan="6"
                          >
                            No history available for the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {/* Pagination Controls */}
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
                  </div>
                  </div>

      {/* Modal Section */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded shadow-lg w-full max-w-md relative">
            <button
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
              onClick={closeModal}
            >
              ×
            </button>
            <h2 className="font-semibold text-lg mb-4">Out Product</h2>
            <form className="grid gap-4" onSubmit={handleSubmit}>
              {/* Select Category */}
              <div className="grid gap-1">
                <label className="font-medium">Camera Category</label>
                <select
                  className="bg-blue-50 border w-full p-2 rounded"
                  value={data.category}
                  onChange={(e) => setData({ ...data, category: e.target.value })}
                >
                  <option value="">Select Camera</option>
                  {allCategory.map((cat) => (
                    <option key={cat._id} value={cat._id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Subcategory */}
              <div className="grid gap-1">
                <label className="font-medium">Camera Part</label>
                <select
                  className="bg-blue-50 border w-full p-2 rounded"
                  value={data.subCategory}
                  onChange={(e) => setData({ ...data, subCategory: e.target.value })}
                  disabled={!filteredSubCategories.length}
                >
                  <option value="">Select Part</option>
                  {filteredSubCategories.map((sub) => (
                    <option key={sub._id} value={sub._id}>
                      {`${sub.code} - ${sub.name}`}
                    </option>
                  ))}
                </select>
              </div>


              {/* Select Box */}
              <div className="grid gap-1">
                <label className="font-medium">Select Box</label>
                <select
                  className="bg-blue-50 border w-full p-2 rounded"
                  value={data.box}
                  onChange={(e) => setData({ ...data, box: e.target.value })}
                  disabled={!filteredBoxes.length}
                >
                  <option value="">Select Box</option>
                  {filteredBoxes.map((box, index) => (
                    <option key={index} value={box._id}>
                      {`Box No: ${box.boxNo}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Total Quantity of Selected Box */}
              {data.box && (
                <div className="bg-gray-100 p-2 rounded text-sm font-medium">
                  <p>
                    Total Quantity of Selected Box:{" "}
                    <span className="font-bold">{selectedBoxQty}</span>
                  </p>
                </div>
              )}

              {/* Quantity */}
              <div className="grid gap-1">
                <label className="font-medium">Quantity</label>
                <input
                  type="number"
                  className="bg-blue-50 border w-full p-2 rounded"
                  value={data.quantity}
                  onChange={(e) => setData({ ...data, quantity: e.target.value })}
                  placeholder="Enter Quantity"
                />
              </div>

              <button
                type="submit"
                className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
              >
                Submit
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default OutProduct;
