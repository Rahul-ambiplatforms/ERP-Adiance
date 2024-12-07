import React, { useState, useEffect } from "react";
import { useSelector } from "react-redux";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import AxiosToastError from "../utils/AxiosToastError";
import successAlert from "../utils/SuccessAlert";
import { utils, writeFile } from "xlsx"; // Import XLSX for Excel generation 

const CameraDelivery = () => {
  const allCategory = useSelector((state) => state.product.allCategory);

  const [data, setData] = useState({
    iwonName: "",
    category: "",
    boxes: [],
  });

// Update initial filters state
const [filters, setFilters] = useState({
    date: "",
    category: "",
    search: "", // Unified search for IWON and UID
  });

  const categoryOptions = allCategory.map((cat) => cat.name);

  const [history, setHistory] = useState([]);
  const [selectCategory, setSelectCategory] = useState("");
  const [availableBoxes, setAvailableBoxes] = useState([]);
  const [selectedBoxes, setSelectedBoxes] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 10;

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const fetchAvailableBoxes = async (categoryName) => {
    try {
      const response = await Axios(SummaryApi.getReadyCameraHistory);
      if (response.data.success) {
        const boxes = response.data.data
          .filter((item) => item.category === categoryName) // Match category by name
          .flatMap((item) =>
            item.boxes.map((box) => ({
              ...box,
              category: item.category, // Add category for context
            }))
          )
          .filter((box) => box.partUIDs.length > 0); // Keep only boxes with non-zero UIDs
  
        setAvailableBoxes(boxes);
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };
  

  useEffect(() => {
    if (data.category) {
      fetchAvailableBoxes(data.category);
    }
  }, [data.category]);

  const handleBoxSelection = (box) => {
    setSelectedBoxes((prev) => [...prev, box]);
    setAvailableBoxes((prev) => prev.filter((b) => b.boxNo !== box.boxNo)); // Remove selected box from available list
  };

  const handleUIDSelection = (boxIndex, uid) => {
    setSelectedBoxes((prev) => {
      const updatedBoxes = [...prev];
      const box = updatedBoxes[boxIndex];
      box.selectedUIDs = box.selectedUIDs || [];
      if (box.selectedUIDs.includes(uid)) {
        box.selectedUIDs = box.selectedUIDs.filter((id) => id !== uid); // Deselect UID
      } else {
        box.selectedUIDs.push(uid); // Select UID
      }
      return updatedBoxes;
    });
  };

  const handleSubmit = async () => {
    try {
      const deliveryData = {
        iwonName: data.iwonName,
        category: data.category,
        boxes: selectedBoxes.map((box) => ({
          boxNo: box.boxNo,
          selectedUIDs: box.selectedUIDs,
        })),
      };
      const response = await Axios({
        ...SummaryApi.deliverCamera,
        data: deliveryData,
      });
      if (response.data.success) {
        successAlert(response.data.message);
        setData({ iwonName: "", category: "", boxes: [] });
        setSelectedBoxes([]);
        setAvailableBoxes([]);
        setIsModalOpen(false);
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  const handleCategoryChange = (categoryId) => {
    const selectedCategory = allCategory.find((cat) => cat._id === categoryId);
    setData((prev) => ({ ...prev, category: selectedCategory.name }));
    setSelectCategory(categoryId);
    fetchAvailableBoxes(selectedCategory.name);
  };

  const fetchDeliveryHistory = async () => {
    try {
      const response = await Axios({
        ...SummaryApi.getDeliveryHistory,
        params: filters,
      });
      if (response.data.success) {
        setHistory(response.data.data);
      }
    } catch (error) {
      AxiosToastError(error);
    }
  };

  useEffect(() => {
    fetchDeliveryHistory();
  }, [filters]);

  const applyFilters = () => {
    return history
      .filter((item) => {
        const matchesDate =
          !filters.date ||
          new Date(item.createdAt).toISOString().slice(0, 10) === filters.date;
  
        const matchesCategory =
          !filters.category || item.category === filters.category;
  
        const matchesSearch =
          !filters.search ||
          item.iwonName.toLowerCase().includes(filters.search.toLowerCase()) ||
          item.boxes.some((box) =>
            box.deliveredUIDs.some((uid) =>
              uid.toLowerCase().includes(filters.search.toLowerCase())
            )
          );
  
        return matchesDate && matchesCategory && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };
  

  const filteredHistory = applyFilters();
  const totalPages = Math.ceil(filteredHistory.length / ITEMS_PER_PAGE);

  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const downloadDeliveryHistory = () => {
    if (filteredHistory.length === 0) {
      alert("No data available to download.");
      return;
    }

    const formattedData = filteredHistory.flatMap((item) =>
      item.boxes.map((box) => ({
        "IWON Name": item.iwonName,
        "Category": item.category,
        "Box No.": box.boxNo,
        "Delivered UIDs": box.deliveredUIDs.join(", "),
        "Date": new Intl.DateTimeFormat("en-GB").format(new Date(item.createdAt)),
      }))
    );

    const worksheet = utils.json_to_sheet(formattedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "DeliveryHistory");

    writeFile(workbook, "Delivery_History.xlsx");
  };

  const downloadDeliveredCameraHistory = () => {
    if (filteredHistory.length === 0) {
      alert("No data available to download.");
      return;
    }
  
    // Format data for Excel export
    const formattedData = filteredHistory.flatMap((item) =>
      item.boxes.map((box) => ({
        "IWON Name": item.iwonName || "N/A",
        "Category Name": item.category || "N/A",
        "Box No.": box.boxNo || "N/A",
        "Delivered UIDs": box.deliveredUIDs.join(", ") || "N/A", // Join UIDs as a single string
        "Total Delivered Qty": box.deliveredUIDs.length || 0,
        "Date": new Intl.DateTimeFormat("en-GB").format(new Date(item.createdAt)) || "N/A",
      }))
    );
  
    // Generate Excel file
    const worksheet = utils.json_to_sheet(formattedData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "DeliveredCameraHistory");
  
    // Download Excel file
    writeFile(workbook, "Delivered_Camera_History.xlsx");
  };
  

  return (
    <section className="bg-white">
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between bg-white shadow-md p-4 rounded mb-4">
          <h2 className="font-semibold text-lg">Camera Delivery</h2>
          <button
            className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
            onClick={openModal}
          >
            Deliver Camera
          </button>
        </div>
        <div className="bg-gray-100 p-4 rounded mb-4">
            <h3 className="font-semibold text-md mb-4">Filters</h3>
            <div className="flex flex-wrap gap-4">
                {/* Date Filter */}
                <div className="flex-1 min-w-[150px]">
                <label className="font-medium block mb-1">Date</label>
                <input
                    type="date"
                    className="w-full p-2 border rounded"
                    value={filters.date}
                    onChange={(e) =>
                    setFilters((prev) => ({ ...prev, date: e.target.value }))
                    }
                />
                </div>
                {/* Category Filter */}
                <div className="flex-1 min-w-[150px]">
                <label className="font-medium block mb-1">Category</label>
                <select
                    className="w-full p-2 border rounded"
                    value={filters.category}
                    onChange={(e) =>
                    setFilters((prev) => ({ ...prev, category: e.target.value }))
                    }
                >
                    <option value="">All Categories</option>
                    {categoryOptions.map((category, index) => (
                    <option key={index} value={category}>
                        {category}
                    </option>
                    ))}
                </select>
                </div>
                {/* Unified Search for IWON and UID */}
                <div className="flex-1 min-w-[250px]">
                <label className="font-medium block mb-1">Search IWON/UID</label>
                <input
                    type="text"
                    className="w-full p-2 border rounded"
                    placeholder="Enter IWON or UID"
                    value={filters.search}
                    onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                    }
                />
                </div>
          </div>
        </div>

        <div className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-md">Delivered Camera History</h3>
              <button
                className="bg-blue-500 text-white py-1 px-4 rounded hover:bg-blue-600"
                onClick={downloadDeliveredCameraHistory }
              >
                Download
              </button>
            </div>
        <div className="overflow-auto">
          <table className="w-full border-collapse border border-gray-200">
            <thead>
              <tr className="bg-blue-50">
                <th className="border border-gray-300 px-4 py-2">IWON Name</th>
                <th className="border border-gray-300 px-4 py-2">Category</th>
                <th className="border border-gray-300 px-4 py-2">Box No.</th>
                <th className="border border-gray-300 px-4 py-2">Delivered UIDs</th>
                <th className="border border-gray-300 px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {paginatedHistory.length > 0 ? (
                paginatedHistory.map((item, index) =>
                  item.boxes.map((box, boxIndex) => (
                    <tr key={`${index}-${boxIndex}`} className="text-center">
                      {boxIndex === 0 && (
                        <>
                          <td
                            rowSpan={item.boxes.length}
                            className="border border-gray-300 px-4 py-2 align-top"
                          >
                            {item.iwonName}
                          </td>
                          <td
                            rowSpan={item.boxes.length}
                            className="border border-gray-300 px-4 py-2 align-top"
                          >
                            {item.category}
                          </td>
                        </>
                      )}
                      <td className="border border-gray-300 px-4 py-2">
                        {box.boxNo}
                      </td>
                      <td className="border border-gray-300 px-4 py-2 whitespace-pre-wrap">
                        {box.deliveredUIDs.join(", ")}
                      </td>
                      {boxIndex === 0 && (
                        <td
                          rowSpan={item.boxes.length}
                          className="border border-gray-300 px-4 py-2 align-top"
                        >
                          {new Intl.DateTimeFormat("en-GB").format(
                            new Date(item.createdAt)
                          )}
                        </td>
                      )}
                    </tr>
                  ))
                )
              ) : (
                <tr>
                  <td
                    colSpan="5"
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

        {isModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                <div className="bg-white p-6 rounded shadow-lg w-full max-w-4xl relative">
                <button
                    className="absolute top-2 right-2 text-gray-600 hover:text-gray-800 text-2xl font-bold"
                    onClick={closeModal}
                >
                    ×
                </button>
                <h2 className="font-semibold text-lg mb-4">Deliver Camera</h2>
                <form className="grid gap-4">
                    <div>
                    <label className="font-medium">IWON Name</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={data.iwonName}
                        onChange={(e) =>
                        setData((prev) => ({ ...prev, iwonName: e.target.value }))
                        }
                    />
                    </div>
                    <div>
                    <label className="font-medium">Select Category</label>
                    <select
                        className="w-full p-2 border rounded"
                        value={selectCategory}
                        onChange={(e) => handleCategoryChange(e.target.value)}
                    >
                        <option value="">Select Category</option>
                        {allCategory.map((cat) => (
                        <option key={cat._id} value={cat._id}>
                            {cat.name}
                        </option>
                        ))}
                    </select>
                    <div>
                        {/* Available Boxes Section */}
                        <div>
                        <label className="font-medium">Available Boxes</label>
                        <div
                            className="max-h-40 overflow-y-auto border border-gray-300 rounded p-2"
                            style={{ maxHeight: "150px" }}
                        >
                            <ul className="grid grid-cols-3 gap-2">
                            {availableBoxes.map((box) => (
                                <li
                                key={box.boxNo}
                                className="bg-blue-50 text-center border rounded p-2 hover:bg-blue-100 cursor-pointer"
                                onClick={() => handleBoxSelection(box)} // Add click handler to the entire <li>
                                >
                                {box.boxNo} {/* No need for a separate <button> now */}
                                </li>
                            ))}
                            </ul>
                        </div>
                        </div>


                        {/* Selected Boxes Section */}
                        <div className="mt-4">
                        <h3 className="font-semibold">Selected Boxes</h3>
                        <div
                            className="max-h-60 overflow-y-auto border border-gray-300 rounded p-2"
                            style={{ maxHeight: "200px" }}
                        >
                            {selectedBoxes.length === 0 ? (
                            <p className="text-gray-500 text-sm">No boxes selected yet.</p>
                            ) : (
                            selectedBoxes.map((box, index) => (
                                <div key={box.boxNo} className="mb-4">
                                <div className="flex justify-between items-center">
                                    <h4 className="text-blue-600 font-medium">{box.boxNo}</h4>
                                    <button
                                    className="text-red-500 font-bold"
                                    onClick={() => {
                                        setAvailableBoxes((prev) => [...prev, box]);
                                        setSelectedBoxes((prev) =>
                                        prev.filter((b) => b.boxNo !== box.boxNo)
                                        );
                                    }}
                                    >
                                    -
                                    </button>
                                </div>
                                <label className="block">
                                    <input
                                    type="checkbox"
                                    className="mr-2"
                                    onChange={(e) => {
                                        const checked = e.target.checked;
                                        setSelectedBoxes((prev) => {
                                        const updated = [...prev];
                                        updated[index].selectedUIDs = checked
                                            ? [...box.partUIDs]
                                            : [];
                                        return updated;
                                        });
                                    }}
                                    checked={
                                        box.selectedUIDs?.length === box.partUIDs.length
                                    }
                                    />
                                    Select All UID
                                </label>
                                <ul className="grid grid-cols-3 gap-2">
                                    {box.partUIDs.slice(0, 9).map((uid) => (
                                    <li
                                        key={uid}
                                        className="bg-gray-50 border rounded p-1 text-sm text-center"
                                    >
                                        <label>
                                        <input
                                            type="checkbox"
                                            className="mr-1"
                                            checked={box.selectedUIDs?.includes(uid) || false}
                                            onChange={() => handleUIDSelection(index, uid)}
                                        />
                                        {uid}
                                        </label>
                                    </li>
                                    ))}
                                </ul>
                                {box.partUIDs.length > 9 && (
                                    <p className="text-gray-500 text-xs mt-1">
                                    Scroll to see more UIDs
                                    </p>
                                )}
                                </div>
                            ))
                            )}
                        </div>
                        </div>
                    </div>
                    </div>
                    <button
                    type="button"
                    className="bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
                    onClick={handleSubmit}
                    >
                    Submit Delivery
                    </button>
                </form>
                </div>
            </div>
            )}


            {totalPages > 1 && (
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span>
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </section>
  );
};

export default CameraDelivery;
