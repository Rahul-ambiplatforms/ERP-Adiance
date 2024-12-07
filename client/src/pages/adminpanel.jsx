import React, { useEffect, useState, useMemo } from "react";
import { useSelector } from "react-redux";
import isAdmin from "../utils/isAdmin";
import Axios from "../utils/Axios";
import SummaryApi from "../common/SummaryApi";
import { combineBoxes } from "../utils";
import { utils, writeFile } from "xlsx";

const Dashboard = () => {
  const user = useSelector((state) => state.user);

  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [damagedProducts, setDamagedProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [zoomedImage, setZoomedImage] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);
  const [totalPartsByCategory, setTotalPartsByCategory] = useState({});
  const [modalData, setModalData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [startDate, setStartDate] = useState(""); // Start date for filtering
  const [endDate, setEndDate] = useState(""); // End date for filtering
  const [filteredModalData, setFilteredModalData] = useState([]);
  const [totalDeliveredByCategory, setTotalDeliveredByCategory] = useState({});



  const fetchTotalDeliveredByCategory = async () => {
    try {
      const response = await Axios.get("http://localhost:8080/api/delivery/history");
      if (response.data.success) {
        const deliveredCount = {};
  
        response.data.data.forEach((record) => {
          const category = record.category;
          if (!deliveredCount[category]) {
            deliveredCount[category] = 0;
          }
          record.boxes.forEach((box) => {
            deliveredCount[category] += box.deliveredUIDs.length;
          });
        });
  
        setTotalDeliveredByCategory(deliveredCount);
      }
    } catch (error) {
      console.error("Error fetching total delivered cameras:", error);
    }
  };
  
  useEffect(() => {
    fetchTotalDeliveredByCategory();
  }, []);


  // Fetch data from APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [
          categoriesResponse,
          subCategoriesResponse,
          productsResponse,
          damagedProductsResponse,
        ] = await Promise.all([
          Axios({ ...SummaryApi.getCategory }),
          Axios({ ...SummaryApi.getSubCategory }),
          Axios({ ...SummaryApi.getProduct }),
          Axios({ ...SummaryApi.getDamageProducts }),
        ]);

        if (categoriesResponse.data.success) setCategories(categoriesResponse.data.data);
        if (subCategoriesResponse.data.success) setSubCategories(subCategoriesResponse.data.data);
        if (productsResponse.data.success) setProducts(productsResponse.data.data);
        if (damagedProductsResponse.data.success)
          setDamagedProducts(damagedProductsResponse.data.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  const fetchTotalPartsByCategory = async () => {
    try {
      const response = await Axios.get("/api/readycamera/history");
      if (response.data.success) {
        const partsCount = {};
        response.data.data.forEach((record) => {
          if (!partsCount[record.category]) {
            partsCount[record.category] = 0;
          }
          record.boxes.forEach((box) => {
            partsCount[record.category] += box.totalParts;
          });
        });
        setTotalPartsByCategory(partsCount);
      }
    } catch (error) {
      console.error("Error fetching total parts by category:", error);
    }
  };
  

  useEffect(() => {
    fetchTotalPartsByCategory();
  }, []);

  
  useEffect(() => {
    fetchTotalDeliveredByCategory();
  }, []);

  // Memoized calculations
  const filteredSubCategories = useMemo(
    () =>
      subCategories.filter((sub) =>
        selectedCategory ? sub.category.some((cat) => cat._id === selectedCategory) : true
      ),
    [subCategories, selectedCategory]
  );

  const calculatePossibleCameras = (categoryId) => {
    const relatedSubCategories = subCategories.filter((sub) =>
      sub.category.some((cat) => cat._id === categoryId)
    );

    if (!relatedSubCategories.length) return 0;

    const cameraCounts = relatedSubCategories.map((sub) => {
      const totalPartsAvailable = getSubCategoryData(sub._id).totalPartsQty;
      const partsPerCamera = sub.partsPerCamera || 1;
      return Math.floor(totalPartsAvailable / partsPerCamera);
    });

    return Math.min(...cameraCounts);
  };

  const getSubCategoryData = useMemo(
    () =>
      (subCategoryId) => {
        const productData = products.filter((product) =>
          product.subCategory.some((sub) => sub._id === subCategoryId)
        );

        const totalBoxes = productData.reduce(
          (acc, product) => acc + (product.boxes?.length || 0),
          0
        );

        const totalPartsQty = productData.reduce(
          (acc, product) =>
            acc +
            product.boxes?.reduce((boxAcc, box) => boxAcc + Number(box.partsQty || 0), 0),
          0
        );

        const detailedBoxes = productData.flatMap((product) =>
          product.boxes.map((box) => ({
            boxNo: box.boxNo,
            partsQty: box.partsQty,
            action: box.partsQty > 0 ? "Add" : "Out",
            dateAdded: product.updatedAt,
          }))
        );

        return { totalBoxes, totalPartsQty, detailedBoxes };
      },
    [products]
  );

  const getTotalDamagedParts = (subCategoryId) => {
    const damagedData = damagedProducts.filter(
      (damage) => damage.subCategory._id === subCategoryId
    );

    return damagedData.reduce((acc, damage) => {
      if (damage.action === "Add") return acc + damage.quantity;
      if (damage.action === "Out") return acc - damage.quantity;
      return acc;
    }, 0);
  };

  if (!isAdmin(user.role)) {
    return <div className="text-center text-red-600 font-bold py-10">Access Denied: Admins Only</div>;
  }

  const fetchModalData = async (categoryId) => {
    try {
      const [productsResponse, outProductsResponse, damageProductsResponse] = await Promise.all([
        Axios({ ...SummaryApi.getProduct }),
        Axios({ ...SummaryApi.getOutProduct }),
        Axios({ ...SummaryApi.getDamageProducts }),
      ]);
  
      const products = productsResponse.data.data || [];
      const outProducts = outProductsResponse.data.data || [];
      const damageProducts = damageProductsResponse.data.data || [];
  
      const startDateFilter = startDate ? new Date(startDate) : null;
      const endDateFilter = endDate ? new Date(endDate) : null;
  
      const partsMap = {};
  
      // **Step 1: Aggregate Inward Quantities**
      products.forEach((product) => {
        product.subCategory.forEach((subCategory) => {
          const subCategoryId = subCategory._id;
  
          if (!partsMap[subCategoryId]) {
            partsMap[subCategoryId] = {
              partsCode: subCategory.code,
              partsName: subCategory.name,
              inwardQty: 0,
              outwardQty: 0,
              damageQty: 0,
              lastUpdated: null,
            };
          }
  
          const productLastUpdated = new Date(product.updatedAt);
          if (
            (!startDateFilter || productLastUpdated >= startDateFilter) &&
            (!endDateFilter || productLastUpdated <= endDateFilter)
          ) {
            const inwardQty = product.boxes.reduce((sum, box) => sum + box.partsQty, 0);
            partsMap[subCategoryId].inwardQty += inwardQty;
  
            if (
              !partsMap[subCategoryId].lastUpdated ||
              partsMap[subCategoryId].lastUpdated < productLastUpdated
            ) {
              partsMap[subCategoryId].lastUpdated = productLastUpdated;
            }
          }
        });
      });
  
      // **Step 2: Aggregate Outward Quantities**
      outProducts.forEach((out) => {
        const subCategoryId = out.subCategory._id;
  
        if (!partsMap[subCategoryId]) return;
  
        const outDate = new Date(out.updatedAt);
        if (
          (!startDateFilter || outDate >= startDateFilter) &&
          (!endDateFilter || outDate <= endDateFilter)
        ) {
          partsMap[subCategoryId].outwardQty += out.quantity;
        }
      });
  
      // **Step 3: Aggregate Damage Quantities**
      damageProducts.forEach((damage) => {
        const subCategoryId = damage.subCategory._id;
  
        if (!partsMap[subCategoryId]) return;
  
        const damageDate = new Date(damage.updatedAt);
        if (
          (!startDateFilter || damageDate >= startDateFilter) &&
          (!endDateFilter || damageDate <= endDateFilter)
        ) {
          partsMap[subCategoryId].damageQty +=
            damage.action === "Add" ? damage.quantity : -damage.quantity;
        }
      });
  
      // **Step 4: Filter Data for Selected Category**
      const filteredPartsMap = Object.values(partsMap).filter((part) =>
        products.some((product) =>
          product.subCategory.some((sub) => sub.code === part.partsCode && product.category.some((cat) => cat._id === categoryId))
        )
      );
  
      const tableData = filteredPartsMap.map((part) => ({
        ...part,
        lastUpdated: part.lastUpdated ? part.lastUpdated.toLocaleString() : "N/A",
      }));
  
      setModalData(tableData);
      setFilteredModalData(tableData); // Initialize filtered data
      setShowModal(true);
    } catch (error) {
      console.error("Error fetching modal data:", error);
    }
  };
  
  

  const applyDateFilter = () => {
    const startDateFilter = startDate ? new Date(startDate) : null;
    const endDateFilter = endDate ? new Date(endDate) : null;

    const filteredData = modalData.filter((data) => {
      const lastUpdated = new Date(data.lastUpdated);
      return (
        (!startDateFilter || lastUpdated >= startDateFilter) &&
        (!endDateFilter || lastUpdated <= endDateFilter)
      );
    });

    setFilteredModalData(filteredData);
  };

  const downloadExcel = () => {
    const worksheet = utils.json_to_sheet(modalData);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, "Parts Summary");

    // Download Excel file
    writeFile(workbook, "Parts_Summary_Report.xlsx");
  };

  if (!isAdmin(user.role)) {
    return <div className="text-center text-red-600 font-bold py-10">Access Denied: Admins Only</div>;
  }
  
  
  
  return (
    <section className="bg-white">
      <div className="container mx-auto p-3">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {categories.map((category) => {
            const possibleCameras = calculatePossibleCameras(category._id);
            const totalParts = totalPartsByCategory[category.name] || 0;
            return (
              <div
                key={category._id}
                className="bg-white shadow rounded-lg p-4 cursor-pointer"
                onClick={() => fetchModalData(category._id)}
              >
                <div className="flex items-center justify-center mb-4">
                  <img
                    src={category.image}
                    alt={category.name}
                    className="w-16 h-16 object-cover"
                  />
                </div>
                <h3 className="text-gray-600 text-center font-semibold text-lg mb-2">
                  {category.name}
                </h3>
                <p className="text-center text-sm text-gray-500">
                  Delivered Camera:{" "}
                  <span className="text-green-500 font-bold text-xl">
                    {totalDeliveredByCategory[category.name] || 0}
                  </span>
                </p>
                <p className="text-center text-sm text-gray-500">
                  Ready to delivery Camera:{" "}
                  <span className="text-purple-500 font-bold text-xl">{totalParts}</span>
                </p>
                <p className="text-center text-sm text-gray-500">
                  Possible to Make Cameras:{" "}
                  <span className="text-blue-500 font-bold text-xl">{possibleCameras}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Modal for Table */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-5xl w-full h-[80vh] overflow-hidden flex flex-col">
              <h2 className="text-lg font-bold mb-4">Parts Summary</h2>

              {/* Date Filter */}
              <div className="flex gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    className="p-2 border rounded-md"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    className="p-2 border rounded-md"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <button
                  className="self-end bg-blue-500 text-white px-4 py-2 rounded"
                  onClick={applyDateFilter}
                >
                  Apply Filter
                </button>
              </div>

              <div className="overflow-auto flex-grow border border-gray-300 rounded-md">
                <table className="table-auto w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100 sticky top-0 z-10">
                      <th className="border border-gray-300 px-4 py-2">Parts Code</th>
                      <th className="border border-gray-300 px-4 py-2">Parts Name</th>
                      <th className="border border-gray-300 px-4 py-2">Inward Qty</th>
                      <th className="border border-gray-300 px-4 py-2">Outward Qty</th>
                      <th className="border border-gray-300 px-4 py-2">Damage Qty</th>
                      <th className="border border-gray-300 px-4 py-2">Last Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredModalData.map((data, index) => (
                      <tr key={index}>
                        <td className="border border-gray-300 px-4 py-2">{data.partsCode}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.partsName}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.inwardQty}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.outwardQty}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.damageQty}</td>
                        <td className="border border-gray-300 px-4 py-2">{data.lastUpdated}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end mt-4">
                <button
                  className="mr-2 bg-green-500 text-white py-2 px-4 rounded"
                  onClick={downloadExcel}
                >
                  Download Excel
                </button>
                <button
                  className="bg-red-500 text-white py-2 px-4 rounded"
                  onClick={() => setShowModal(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Filter */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">Select Category</label>
          <select
            className="w-full p-2 border rounded-md bg-gray-50"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategories */}
        <div>
          {filteredSubCategories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredSubCategories.map((sub) => {
                const { totalBoxes, totalPartsQty, detailedBoxes } = getSubCategoryData(sub._id);
                const totalDamagedParts = getTotalDamagedParts(sub._id);

                return (
                  <div
                    key={sub._id}
                    className="bg-white shadow rounded-lg p-4 flex flex-col items-center"
                  >
                    <img
                      src={sub.image}
                      alt={sub.name}
                      className="w-full h-32 object-contain mb-2 cursor-pointer"
                      onClick={() => setZoomedImage(sub.image)}
                    />
                    <h3 className="text-gray-600 font-medium text-center">{sub.name}</h3>
                    <div
                      className="cursor-pointer text-sm text-gray-500 text-center"
                      onClick={() => setSelectedDetails(detailedBoxes)}
                    >
                      <p>Code: {sub.code}</p>
                      <p>Total Available Boxes: {totalBoxes}</p>
                      <p>Total Ready Parts: {totalPartsQty}</p>
                      <p>Total Damaged Parts: {totalDamagedParts}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500">No subcategories found.</p>
          )}
        </div>

        {/* Image Zoom Modal */}
        {zoomedImage && (
          <div
            className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
          >
            <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-full" />
            <button
              className="absolute top-4 right-4 bg-red-600 text-white p-2 rounded"
              onClick={() => setZoomedImage(null)}
            >
              Close
            </button>
          </div>
        )}

        {/* Details Modal */}
        {selectedDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full">
              <h2 className="text-lg font-bold mb-4">Box Details</h2>
              <table className="table-auto w-full border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 px-4 py-2">Box No.</th>
                    <th className="border border-gray-300 px-4 py-2">Parts Qty</th>
                    <th className="border border-gray-300 px-4 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {combineBoxes(selectedDetails).map((box, index) => (
                    <tr key={index} className="text-center">
                      <td className="border border-gray-300 px-4 py-2">{box.boxNo}</td>
                      <td className="border border-gray-300 px-4 py-2">{box.partsQty}</td>
                      <td className="border border-gray-300 px-4 py-2">
                        {new Date(box.dateAdded).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <button
                className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
                onClick={() => setSelectedDetails(null)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Dashboard;
