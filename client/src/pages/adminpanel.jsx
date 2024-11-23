import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import isAdmin from '../utils/isAdmin';
import Axios from '../utils/Axios';
import SummaryApi from '../common/SummaryApi';
import { combineBoxes } from '../utils';


const Dashboard = () => {
  const user = useSelector((state) => state.user);
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [zoomedImage, setZoomedImage] = useState(null);
  const [selectedDetails, setSelectedDetails] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [categoriesResponse, subCategoriesResponse, productsResponse] = await Promise.all([
          Axios({ ...SummaryApi.getCategory }),
          Axios({ ...SummaryApi.getSubCategory }),
          Axios({ ...SummaryApi.getProduct }),
        ]);

        if (categoriesResponse.data.success) setCategories(categoriesResponse.data.data);
        if (subCategoriesResponse.data.success) setSubCategories(subCategoriesResponse.data.data);
        if (productsResponse.data.success) setProducts(productsResponse.data.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const getSubCategoryData = (subCategoryId) => {
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
        action: box.partsQty > 0 ? "Add" : "Out", // Add logic for action
        dateAdded: product.updatedAt,// Fetch the updatedAt field directly from the product
      }))
    );

    return { totalBoxes, totalPartsQty, detailedBoxes };
  };

  const filteredSubCategories = subCategories.filter((sub) =>
    selectedCategory ? sub.category.some((cat) => cat._id === selectedCategory) : true
  );

  if (!isAdmin(user.role)) {
    return <div className="text-center text-red-600 font-bold py-10">Access Denied: Admins Only</div>;
  }

  return (
    <section className="bg-white">
      <div className="container mx-auto p-3">
        {/* Stat Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
          {['Total Cameras', 'Total Box', 'Today Summary', 'Live Projects'].map((title, index) => (
            <div key={index} className="bg-white shadow rounded-lg p-4">
              <div className="flex items-center justify-between">
                <h3 className="text-gray-600 text-sm font-semibold">{title.toUpperCase()}</h3>
                <span
                  className={`p-2 rounded-full ${
                    ['bg-blue-500', 'bg-green-500', 'bg-orange-500', 'bg-purple-500'][index]
                  } text-white text-sm`}
                >
                  $
                </span>
              </div>
              <h2 className="mt-2 text-3xl font-bold">79352</h2>
              <p className="text-sm text-gray-500">55539</p>
            </div>
          ))}
        </div>

        {/* Category Filter */}
        <div className="mb-6">
          <label className="block text-lg font-medium text-gray-700 mb-2">
            Select Category
          </label>
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
                      <p>Total Boxes: {totalBoxes}</p>
                      <p>Total Parts Qty: {totalPartsQty}</p>
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
                    {/* <th className="border border-gray-300 px-4 py-2">Action</th> */}
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
