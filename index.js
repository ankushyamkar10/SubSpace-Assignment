const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const _ = require("lodash");
const { log } = require("console");
const { default: axios } = require("axios");
const PORT = 4000 || process.env.PORT;

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

var memo = _.memoize(_.values);

app.get("/api/blog-stats", async (req, res) => {
  try {
    // checking if blogs are cached
    const cachedResponse = memo.cache.get("data-retrievel");
    if (cachedResponse) {
      res.send({ response: cachedResponse });
      return;
    }
    const response = await axios.get(
      "https://intent-kit-16.hasura.app/api/rest/blogs",
      {
        headers: {
          "x-hasura-admin-secret":
            "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
        },
      }
    );

    const { blogs } = response.data;
    const totalNumberOfBlogs = _.size(blogs);
    const longestTitleBlog = _.maxBy(blogs, (blog) => blog.title.length);
    const titleWithPrivacy = _.filter(blogs, ({ title }) =>
      _.includes(_.toLower(title), "privacy")
    );
    const uniqueTitlesBlogs = _.uniqBy(blogs, (blog) => _.toLower(blog.title));

    const responsearray = [
      {
        totalNumberOfBlogs,
        longestTitleBlog,
        titleWithPrivacy,
        uniqueTitlesBlogs,
      },
    ];
    // setting the data-retrievel cache
    memo.cache.set("data-retrievel", responsearray);
    // setting the blogs cache
    memo.cache.set("blogs", blogs);
    res.send({ response: responsearray });
  } catch (error) {
    log(error);
    res.status(500).send({
      message: "Data Retrievel/analysis failed due to something went wrong",
    });
  }
});

app.get("/api/blog-search", async (req, res) => {
  try {
    const { query } = req.query;
    let blogs = undefined;
    const cachedBlogs = memo.cache.get("blogs");
    const cachedQuery = memo.cache.get(`search-${query}`);

    if (cachedQuery) {
      // if the query word is cached
      res.send({ response: cachedQuery });
      return;
    } else if (cachedBlogs) {
      // checking for the blogs are cached or not
      blogs = cachedBlogs;
    } else {
      const response = await axios.get(
        "https://intent-kit-16.hasura.app/api/rest/blogs",
        {
          headers: {
            "x-hasura-admin-secret":
              "32qR4KmXOIpsGPQKMqEJHGJS27G5s7HdSKO3gdtQd2kv5e852SiYwWNfxkZOBuQ6",
          },
        }
      );

      blogs = response.data.blogs;
      // setting blogs cache
      memo.cache.set("blogs", blogs);
    }
    const blogWithQuery = _.filter(blogs, ({ title }) =>
      _.includes(title, query)
    );

    // setting the cache for word searched
    memo.cache.set(`search-${query}`, blogWithQuery);
    res.send({ response: blogWithQuery });
  } catch (error) {
    res
      .status(500)
      .send({ message: "Something went wrong in serving the query" });
  }
});

app.listen(PORT, () => log("Connected on port 4000"));
